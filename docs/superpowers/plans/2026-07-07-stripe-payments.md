# Paiement en ligne (Stripe) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After Charline validates a booking request, the cliente receives an optional "Régler ma séance" link that charges the prestation price via Stripe Checkout; a webhook records the payment.

**Architecture:** Stripe hosted Checkout (server-side redirect, no client Stripe.js). A `payments` table tracks each séance's payment. A public `/regler/<token>` page lazily creates a Checkout Session on click (never-expiring link, works for logged-out prospects). A webhook at `/api/webhooks/stripe` marks payments paid. A simulated payment service mirrors the existing email pattern so the whole flow runs without real keys in demo mode.

**Tech Stack:** Next.js 16 (App Router, server actions, route handlers), Prisma 7 (`@prisma/adapter-pg`, PostgreSQL/Neon), `stripe` npm package, Vitest, Tailwind.

## Global Constraints

- **Read the guide before writing Next.js code:** `node_modules/next/dist/docs/` — this Next.js (16.2.9) differs from training data. Heed deprecation notices.
- **Do NOT use `prisma migrate dev`.** The `prisma/migrations/` folder is stale (belongs to a different template: `Reservation`/`Pricing`/PascalCase). This DB is introspection-managed. Add the table via `prisma db execute` + a hand-written SQL file, then `prisma generate`.
- **Secrets only in `.env`** (gitignored). Never commit a real key. Never add `STRIPE_*` to a committed file except `.env.example` (with empty values).
- **Simulated-first:** every integration must work with `DEMO_MODE="true"` or missing Stripe keys — no real network call in that mode. Mirror `lib/integrations/email.ts`.
- **Amounts in cents (int).** `care_types.prix` is a Prisma `Decimal` euro value; convert with `Math.round(Number(prix) * 100)`.
- **Currency:** `"eur"`.
- **Never trust `success_url` for fulfillment with real Stripe** — the webhook is the source of truth. (Simulated sessions, id prefix `sim_`, are the one exception and may be marked paid on return.)
- **Test style:** match the repo — unit-test pure functions and the service selector (see `lib/integrations/__tests__/email.test.ts`). Do NOT write tests that hit the database or Stripe.
- **Path alias:** `@/` maps to project root. Run tests with `npx vitest run <file>`.

---

## File Structure

- `lib/integrations/types.ts` — **modify**: add `PaymentService` interface + `CheckoutParams` / `CheckoutSession` types.
- `lib/integrations/payments.ts` — **create**: `SimulatedPaymentService`, `StripePaymentService`, `getPaymentService()`, pure helpers `toAmountCents`, `parseCheckoutCompleted`.
- `lib/payments.ts` — **create**: domain helpers `createSeancePayment`, `paymentPublicUrl`, `checkoutUrls`.
- `prisma/schema.prisma` — **modify**: add `payments` model + relations on `profiles` and `seances`.
- `prisma/sql/2026-07-07-payments.sql` — **create**: raw `CREATE TABLE payments`.
- `lib/integrations/email.ts` — **modify**: add optional pay button to `bookingConfirmedClientHtml`.
- `lib/notifications.ts` — **modify**: `notifyBookingConfirmed` accepts `payUrl?`.
- `app/admin/demandes/actions.ts` — **modify**: create payment on confirm, pass `payUrl`.
- `app/regler/[token]/page.tsx` — **create**: public payment page.
- `app/regler/[token]/actions.ts` — **create**: `startCheckoutAction` server action.
- `app/api/webhooks/stripe/route.ts` — **create**: webhook handler.
- `app/admin/seances/[id]/page.tsx` — **modify**: render payment panel.
- `app/admin/seances/[id]/payment-panel.tsx` — **create**: badge + "Marquer réglé" + "Renvoyer le lien".
- `app/admin/seances/[id]/payment-actions.ts` — **create**: `markPaidAction`, `resendLinkAction`.
- `app/espace/page.tsx` — **modify**: show "Régler"/"Réglé" per séance.
- `.env` / `.env.example` — **modify**: add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- Tests: `lib/integrations/__tests__/payments.test.ts`, `lib/__tests__/payments.test.ts`.

---

## Task 1: Stripe payment service (simulated + real selector)

Adds the `stripe` dependency, env vars, and the integration layer with a demo-mode fallback. No DB yet.

**Files:**
- Modify: `lib/integrations/types.ts`
- Create: `lib/integrations/payments.ts`
- Create: `lib/integrations/__tests__/payments.test.ts`
- Modify: `.env`, `.env.example`

**Interfaces:**
- Produces:
  - `PaymentService.createCheckoutSession(p: CheckoutParams): Promise<CheckoutSession>`
  - `PaymentService.verifyWebhook(rawBody: string, signature: string | null): StripeWebhookResult | null`
  - `getPaymentService(): PaymentService`
  - `toAmountCents(prix: unknown): number`
  - `parseCheckoutCompleted(event: { type: string; data?: { object?: { metadata?: Record<string,string> | null; payment_intent?: string | null } } }): { paymentId: string; paymentIntent?: string } | null`
  - Types: `CheckoutParams = { amountCents: number; currency: string; label: string; successUrl: string; cancelUrl: string; metadata: Record<string,string> }`, `CheckoutSession = { id: string; url: string; simulated: boolean }`, `StripeWebhookResult = { type: string; paymentId?: string; paymentIntent?: string }`

- [ ] **Step 1: Install the Stripe SDK**

Run:
```bash
npm install stripe
```
Expected: `stripe` added to `dependencies` in `package.json`.

- [ ] **Step 2: Add types to `lib/integrations/types.ts`**

Append to the end of the file:
```ts
export type CheckoutParams = {
  amountCents: number;
  currency: string;
  label: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
};

export type CheckoutSession = { id: string; url: string; simulated: boolean };

export type StripeWebhookResult = { type: string; paymentId?: string; paymentIntent?: string };

export interface PaymentService {
  createCheckoutSession(p: CheckoutParams): Promise<CheckoutSession>;
  /** Returns null if the signature is invalid or the event is irrelevant. */
  verifyWebhook(rawBody: string, signature: string | null): StripeWebhookResult | null;
}
```

- [ ] **Step 3: Write the failing test**

Create `lib/integrations/__tests__/payments.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { getPaymentService, toAmountCents, parseCheckoutCompleted } from "@/lib/integrations/payments";

describe("toAmountCents", () => {
  it("converts euro decimals to integer cents", () => {
    expect(toAmountCents("60")).toBe(6000);
    expect(toAmountCents("60.5")).toBe(6050);
    expect(toAmountCents(49.99)).toBe(4999);
  });
  it("returns 0 for null/invalid", () => {
    expect(toAmountCents(null)).toBe(0);
    expect(toAmountCents("abc")).toBe(0);
  });
});

describe("getPaymentService (demo mode)", () => {
  beforeEach(() => {
    process.env.DEMO_MODE = "true";
    process.env.STRIPE_SECRET_KEY = "";
  });
  it("returns a simulated service that yields a sim_ session pointing at successUrl", async () => {
    const svc = getPaymentService();
    const s = await svc.createCheckoutSession({
      amountCents: 6000, currency: "eur", label: "Séance",
      successUrl: "http://localhost:3000/regler/abc?status=success",
      cancelUrl: "http://localhost:3000/regler/abc",
      metadata: { paymentId: "p1" },
    });
    expect(s.simulated).toBe(true);
    expect(s.id.startsWith("sim_")).toBe(true);
    expect(s.url).toBe("http://localhost:3000/regler/abc?status=success");
  });
  it("verifyWebhook returns null in simulated mode", () => {
    expect(getPaymentService().verifyWebhook("{}", null)).toBeNull();
  });
});

describe("parseCheckoutCompleted", () => {
  it("extracts paymentId + payment_intent on completed", () => {
    const r = parseCheckoutCompleted({
      type: "checkout.session.completed",
      data: { object: { metadata: { paymentId: "p1" }, payment_intent: "pi_1" } },
    });
    expect(r).toEqual({ paymentId: "p1", paymentIntent: "pi_1" });
  });
  it("returns null for other event types", () => {
    expect(parseCheckoutCompleted({ type: "payment_intent.created" })).toBeNull();
  });
  it("returns null when paymentId metadata is missing", () => {
    expect(parseCheckoutCompleted({ type: "checkout.session.completed", data: { object: {} } })).toBeNull();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run lib/integrations/__tests__/payments.test.ts`
Expected: FAIL — cannot resolve `@/lib/integrations/payments`.

- [ ] **Step 5: Implement `lib/integrations/payments.ts`**

Create the file:
```ts
import type {
  PaymentService,
  CheckoutParams,
  CheckoutSession,
  StripeWebhookResult,
} from "@/lib/integrations/types";

/** Euro Decimal/number/string → integer cents. Returns 0 when not parseable. */
export function toAmountCents(prix: unknown): number {
  const n = typeof prix === "number" ? prix : parseFloat(String(prix ?? ""));
  if (!isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

/** Pure: pull our paymentId + payment_intent out of a Stripe event shape. */
export function parseCheckoutCompleted(event: {
  type: string;
  data?: { object?: { metadata?: Record<string, string> | null; payment_intent?: string | null } };
}): { paymentId: string; paymentIntent?: string } | null {
  if (event.type !== "checkout.session.completed") return null;
  const obj = event.data?.object;
  const paymentId = obj?.metadata?.paymentId;
  if (!paymentId) return null;
  const pi = obj?.payment_intent;
  return { paymentId, paymentIntent: pi ?? undefined };
}

// ───────── Simulated service (demo / no API key) ─────────

class SimulatedPaymentService implements PaymentService {
  async createCheckoutSession(p: CheckoutParams): Promise<CheckoutSession> {
    // No real charge: send the user straight to the success URL.
    return { id: `sim_${Date.now()}`, url: p.successUrl, simulated: true };
  }
  verifyWebhook(): StripeWebhookResult | null {
    return null; // webhook path is unused without real Stripe
  }
}

// ───────── Real Stripe service ─────────

class StripePaymentService implements PaymentService {
  constructor(private secretKey: string, private webhookSecret: string) {}

  private client() {
    // Lazy import keeps the SDK out of the simulated path / edge bundles.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require("stripe");
    return new Stripe(this.secretKey);
  }

  async createCheckoutSession(p: CheckoutParams): Promise<CheckoutSession> {
    const stripe = this.client();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: p.currency,
            unit_amount: p.amountCents,
            product_data: { name: p.label },
          },
        },
      ],
      metadata: p.metadata,
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
    });
    return { id: session.id, url: session.url as string, simulated: false };
  }

  verifyWebhook(rawBody: string, signature: string | null): StripeWebhookResult | null {
    if (!signature || !this.webhookSecret) return null;
    const stripe = this.client();
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch {
      return null; // bad signature
    }
    const parsed = parseCheckoutCompleted(event);
    if (!parsed) return { type: event.type };
    return { type: event.type, paymentId: parsed.paymentId, paymentIntent: parsed.paymentIntent };
  }
}

// ───────── Selector ─────────

export function getPaymentService(): PaymentService {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const demo = process.env.DEMO_MODE === "true";
  if (!key || demo) return new SimulatedPaymentService();
  return new StripePaymentService(key, process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "");
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run lib/integrations/__tests__/payments.test.ts`
Expected: PASS (all cases).

- [ ] **Step 7: Add env vars**

In `.env.example`, after the Brevo block, add:
```
# Stripe — paiement en ligne (laisser vide = paiements simulés)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
```
In `.env`, add the same two lines (values stay empty for now — real keys added later by the user). Keep `DEMO_MODE="true"` unchanged.

- [ ] **Step 8: Commit**

```bash
git add lib/integrations/types.ts lib/integrations/payments.ts lib/integrations/__tests__/payments.test.ts .env.example package.json package-lock.json
git commit -m "feat(payments): Stripe payment service with simulated fallback"
```
(Note: `.env` is gitignored and won't be staged — that's expected.)

---

## Task 2: `payments` table

Adds the model to the Prisma schema and creates the table directly in the DB (no `migrate dev`).

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/sql/2026-07-07-payments.sql`

**Interfaces:**
- Produces: Prisma model `payments` with fields `id, cliente_id, seance_id, token, amount_cents, currency, label, status, stripe_session_id, stripe_payment_intent, paid_at, created_at`; relations `profiles` and `seances`. `prisma.payments` available on the client.

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

Add this model (place it after the `seances` model):
```prisma
model payments {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  cliente_id            String    @db.Uuid
  seance_id             String?   @db.Uuid
  token                 String    @unique
  amount_cents          Int
  currency              String    @default("eur")
  label                 String
  status                String    @default("pending")
  stripe_session_id     String?
  stripe_payment_intent String?
  paid_at               DateTime? @db.Timestamptz(6)
  created_at            DateTime  @default(now()) @db.Timestamptz(6)
  profiles              profiles  @relation(fields: [cliente_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  seances               seances?  @relation(fields: [seance_id], references: [id], onDelete: SetNull, onUpdate: NoAction)

  @@index([cliente_id])
  @@index([seance_id])
}
```

- [ ] **Step 2: Add the back-relations**

In the `profiles` model, add to the relations list (alongside `seances seances[]`):
```prisma
  payments                payments[]
```
In the `seances` model, add (alongside `private_notes private_notes[]`):
```prisma
  payments      payments[]
```

- [ ] **Step 3: Create the SQL file**

Create `prisma/sql/2026-07-07-payments.sql`:
```sql
CREATE TABLE IF NOT EXISTS "payments" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "cliente_id"            UUID NOT NULL,
  "seance_id"             UUID,
  "token"                 TEXT NOT NULL,
  "amount_cents"          INTEGER NOT NULL,
  "currency"              TEXT NOT NULL DEFAULT 'eur',
  "label"                 TEXT NOT NULL,
  "status"                TEXT NOT NULL DEFAULT 'pending',
  "stripe_session_id"     TEXT,
  "stripe_payment_intent" TEXT,
  "paid_at"               TIMESTAMPTZ,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "payments_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "payments_seance_id_fkey"  FOREIGN KEY ("seance_id")  REFERENCES "seances"("id")  ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "payments_token_key" ON "payments"("token");
CREATE INDEX IF NOT EXISTS "payments_cliente_id_idx" ON "payments"("cliente_id");
CREATE INDEX IF NOT EXISTS "payments_seance_id_idx" ON "payments"("seance_id");
```

- [ ] **Step 4: Apply the SQL to the database**

Run:
```bash
npx prisma db execute --file prisma/sql/2026-07-07-payments.sql --schema prisma/schema.prisma
```
Expected: `Script executed successfully.`

- [ ] **Step 5: Regenerate the Prisma client**

Run:
```bash
npx prisma generate
```
Expected: `Generated Prisma Client`. This makes `prisma.payments` typed.

- [ ] **Step 6: Verify the schema compiles**

Run:
```bash
npx prisma validate --schema prisma/schema.prisma
```
Expected: `The schema at prisma/schema.prisma is valid`.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/sql/2026-07-07-payments.sql
git commit -m "feat(payments): add payments table"
```

---

## Task 3: Create the payment on booking confirmation

Domain helper + wire it into `confirmBookingAction`, and add the pay button to the confirmation email.

**Files:**
- Create: `lib/payments.ts`
- Create: `lib/__tests__/payments.test.ts`
- Modify: `lib/integrations/email.ts` (`bookingConfirmedClientHtml`)
- Modify: `lib/notifications.ts` (`notifyBookingConfirmed`)
- Modify: `app/admin/demandes/actions.ts` (`confirmBookingAction`)

**Interfaces:**
- Consumes: `toAmountCents` (Task 1), `prisma.payments` (Task 2), `getEmailService`/`bookingConfirmedClientHtml` (existing).
- Produces:
  - `paymentPublicUrl(token: string): string` — `${base}/regler/${token}`
  - `checkoutUrls(token: string): { successUrl: string; cancelUrl: string }`
  - `createSeancePayment(args: { clienteId: string; seanceId: string | null; prix: unknown; label: string }): Promise<string | null>` — returns the payment token, or `null` when `prix` is 0/absent.
  - `newPaymentToken(): string`
  - `notifyBookingConfirmed(p: { clientEmail; clientName; prestation; date; payUrl?: string }): Promise<void>`
  - `bookingConfirmedClientHtml(p: { ...; payUrl?: string })`

- [ ] **Step 1: Write the failing test for `paymentPublicUrl` / `newPaymentToken`**

Create `lib/__tests__/payments.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { paymentPublicUrl, checkoutUrls, newPaymentToken } from "@/lib/payments";

describe("payment URLs", () => {
  beforeEach(() => { process.env.NEXTAUTH_URL = "http://localhost:3000"; });
  it("builds the public /regler URL from the token", () => {
    expect(paymentPublicUrl("abc")).toBe("http://localhost:3000/regler/abc");
  });
  it("builds success/cancel URLs", () => {
    const { successUrl, cancelUrl } = checkoutUrls("abc");
    expect(successUrl).toBe("http://localhost:3000/regler/abc?status=success");
    expect(cancelUrl).toBe("http://localhost:3000/regler/abc?status=cancel");
  });
});

describe("newPaymentToken", () => {
  it("returns a url-safe token of decent length", () => {
    const t = newPaymentToken();
    expect(t.length).toBeGreaterThanOrEqual(20);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("is unique across calls", () => {
    expect(newPaymentToken()).not.toBe(newPaymentToken());
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/payments.test.ts`
Expected: FAIL — cannot resolve `@/lib/payments`.

- [ ] **Step 3: Implement `lib/payments.ts`**

Create the file:
```ts
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { toAmountCents } from "@/lib/integrations/payments";

function baseUrl(): string {
  return (process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
}

export function newPaymentToken(): string {
  return randomBytes(24).toString("base64url");
}

export function paymentPublicUrl(token: string): string {
  return `${baseUrl()}/regler/${token}`;
}

export function checkoutUrls(token: string): { successUrl: string; cancelUrl: string } {
  const u = paymentPublicUrl(token);
  return { successUrl: `${u}?status=success`, cancelUrl: `${u}?status=cancel` };
}

/**
 * Create a pending payment for a séance. Returns the token, or null when the
 * prestation has no price (nothing to charge).
 */
export async function createSeancePayment(args: {
  clienteId: string;
  seanceId: string | null;
  prix: unknown;
  label: string;
}): Promise<string | null> {
  const amount = toAmountCents(args.prix);
  if (amount <= 0) return null;
  const token = newPaymentToken();
  await prisma.payments.create({
    data: {
      cliente_id: args.clienteId,
      seance_id: args.seanceId,
      token,
      amount_cents: amount,
      currency: "eur",
      label: args.label,
      status: "pending",
    },
  });
  return token;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/__tests__/payments.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the pay button to the confirmation email**

In `lib/integrations/email.ts`, replace the `bookingConfirmedClientHtml` function with:
```ts
export function bookingConfirmedClientHtml(p: {
  businessName: string;
  clientName: string;
  prestation: string;
  dateLabel: string;
  intro?: string;
  payUrl?: string;
}): string {
  const payButton = p.payUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;"><tr><td style="border-radius:999px;background:${C.primary};"><a href="${p.payUrl}" style="display:inline-block;padding:13px 26px;font:600 15px/1 ${SANS};color:#ffffff;text-decoration:none;border-radius:999px;">Régler ma séance</a></td></tr></table>` +
      para(`<span style="color:${SUBTLE};font-size:13px;">Le paiement en ligne est optionnel — tu peux aussi régler sur place.</span>`)
    : "";
  return emailShell({
    businessName: p.businessName,
    badge: "Rendez-vous confirmé",
    accent: C.secondary,
    heading: "C'est confirmé ✨",
    body:
      para(p.intro || `${p.clientName}, ton rendez-vous est confirmé.`) +
      detailsBox([
        ["Prestation", p.prestation],
        ["Le", p.dateLabel],
      ]) +
      payButton +
      para("Prends soin de toi d'ici là. À très vite 🌿"),
  });
}
```

- [ ] **Step 6: Thread `payUrl` through `notifyBookingConfirmed`**

In `lib/notifications.ts`, replace the `notifyBookingConfirmed` function with:
```ts
/** On validation: confirm to the cliente (with optional pay link). Best-effort. */
export async function notifyBookingConfirmed(p: {
  clientEmail: string;
  clientName: string;
  prestation: string;
  date: Date;
  payUrl?: string;
}): Promise<void> {
  const email = getEmailService({ fromEmail: FROM, fromName: BRAND });
  const msg = (await getEmailMessages()).booking_confirmed;
  try {
    await email.send({
      to: p.clientEmail,
      toName: p.clientName,
      subject: msg.subject,
      html: bookingConfirmedClientHtml({ businessName: BRAND, clientName: p.clientName, prestation: p.prestation, dateLabel: rdvDateLabel(p.date), intro: msg.intro, payUrl: p.payUrl }),
    });
  } catch (e) {
    console.error("⚠️ email confirmation cliente:", e);
  }
}
```

- [ ] **Step 7: Create the payment in `confirmBookingAction`**

In `app/admin/demandes/actions.ts`:

(a) Add imports at the top (after the existing imports):
```ts
import { createSeancePayment, paymentPublicUrl } from "@/lib/payments";
```

(b) Replace the body of the `try { ... }` that creates the séance and sends the email (lines that create the séance through the `notifyBookingConfirmed` call) with:
```ts
    // Crée automatiquement la séance correspondante (best-effort : certaines
    // prestations personnalisées peuvent ne pas correspondre aux types autorisés).
    let seanceId: string | null = null;
    try {
      const seance = await prisma.seances.create({
        data: { cliente_id: booking.cliente_id, type: booking.care_types.nom, date: booking.requested_date },
      });
      seanceId = seance.id;
    } catch (e) {
      console.error("⚠️ séance auto non créée:", e);
    }

    // Paiement optionnel : crée une ligne de paiement si la prestation a un prix.
    let payUrl: string | undefined;
    try {
      const token = await createSeancePayment({
        clienteId: booking.cliente_id,
        seanceId,
        prix: booking.care_types.prix,
        label: booking.care_types.nom,
      });
      if (token) payUrl = paymentPublicUrl(token);
    } catch (e) {
      console.error("⚠️ paiement non créé:", e);
    }

    if (booking.profiles.email) {
      await notifyBookingConfirmed({
        clientEmail: booking.profiles.email,
        clientName: clienteName(booking.profiles),
        prestation: booking.care_types.nom,
        date: booking.requested_date,
        payUrl,
      });
    }
```

- [ ] **Step 8: Run the full test suite + typecheck**

Run:
```bash
npx vitest run && npx tsc --noEmit
```
Expected: all tests PASS, no type errors.

- [ ] **Step 9: Commit**

```bash
git add lib/payments.ts lib/__tests__/payments.test.ts lib/integrations/email.ts lib/notifications.ts app/admin/demandes/actions.ts
git commit -m "feat(payments): create payment + pay link on booking confirmation"
```

---

## Task 4: Public payment page `/regler/[token]`

The cliente lands here from the email. Shows amount, a "Payer" button that creates a Checkout Session and redirects. Handles success/cancel/already-paid states. Simulated sessions are marked paid on the success return.

**Files:**
- Create: `app/regler/[token]/actions.ts`
- Create: `app/regler/[token]/page.tsx`

**Interfaces:**
- Consumes: `getPaymentService` (Task 1), `prisma.payments` (Task 2), `checkoutUrls` (Task 3).
- Produces: `startCheckoutAction(token: string): Promise<void>` (server action; redirects).

- [ ] **Step 1: Implement the server action**

Create `app/regler/[token]/actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPaymentService } from "@/lib/integrations/payments";
import { checkoutUrls } from "@/lib/payments";

export async function startCheckoutAction(token: string): Promise<void> {
  const payment = await prisma.payments.findUnique({ where: { token } });
  if (!payment) redirect(`/regler/${token}?status=error`);
  if (payment.status === "paid") redirect(`/regler/${token}?status=success`);

  const { successUrl, cancelUrl } = checkoutUrls(token);
  const svc = getPaymentService();
  const session = await svc.createCheckoutSession({
    amountCents: payment.amount_cents,
    currency: payment.currency,
    label: payment.label,
    successUrl,
    cancelUrl,
    metadata: { paymentId: payment.id },
  });
  await prisma.payments.update({
    where: { id: payment.id },
    data: { stripe_session_id: session.id },
  });
  redirect(session.url);
}
```

- [ ] **Step 2: Implement the page**

Create `app/regler/[token]/page.tsx`:
```tsx
import { prisma } from "@/lib/db";
import { theme } from "@/lib/theme";
import { startCheckoutAction } from "./actions";

export const dynamic = "force-dynamic";

function euros(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export default async function ReglerPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await params;
  const { status } = await searchParams;
  const payment = await prisma.payments.findUnique({ where: { token } });

  // Simulated sessions never fire a webhook: mark paid on the success return.
  if (
    payment &&
    payment.status === "pending" &&
    status === "success" &&
    payment.stripe_session_id?.startsWith("sim_")
  ) {
    await prisma.payments.update({
      where: { id: payment.id },
      data: { status: "paid", paid_at: new Date() },
    });
    payment.status = "paid";
  }

  const paid = payment?.status === "paid" || status === "success";

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="relative z-10 w-full max-w-sm">
        <div className="surface-soft rounded-[1.75rem] p-8 text-center shadow-xl shadow-primary/5">
          <p className="font-serif text-2xl tracking-tight text-foreground">{theme.business.name}</p>

          {!payment ? (
            <p className="mt-6 text-sm text-red-600">Ce lien de paiement est invalide.</p>
          ) : paid ? (
            <>
              <p className="mt-4 text-sm text-foreground/60">Paiement bien reçu</p>
              <p className="mt-2 text-lg text-foreground">Merci ! Ta séance « {payment.label} » est réglée 🌿</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-foreground/55">Régler ta séance</p>
              <p className="mt-6 font-serif text-3xl text-foreground">{euros(payment.amount_cents)}</p>
              <p className="mt-1 text-sm text-foreground/60">{payment.label}</p>
              {status === "cancel" && (
                <p className="mt-4 text-sm text-foreground/55">Paiement annulé — tu peux réessayer quand tu veux.</p>
              )}
              <form action={startCheckoutAction.bind(null, token)} className="mt-7">
                <button
                  type="submit"
                  className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:opacity-90"
                >
                  Payer {euros(payment.amount_cents)}
                </button>
              </form>
              <p className="mt-3 text-xs text-foreground/45">Paiement sécurisé par Stripe.</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Manually verify the simulated flow**

Run: `npm run dev`
Then, with a real payment token from the DB (create one by confirming a booking whose prestation has a price, or insert a row), visit `http://localhost:3000/regler/<token>`.
Expected: amount page → click "Payer" → (simulated) redirect back to `?status=success` → "Ta séance est réglée". Re-check the DB row: `status = 'paid'`, `paid_at` set.

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: no errors.
```bash
git add app/regler/
git commit -m "feat(payments): public /regler payment page + checkout redirect"
```

---

## Task 5: Stripe webhook

Real-mode fulfillment. Verifies the signature, marks the payment paid idempotently.

**Files:**
- Create: `app/api/webhooks/stripe/route.ts`

**Interfaces:**
- Consumes: `getPaymentService().verifyWebhook` (Task 1), `prisma.payments` (Task 2).

- [ ] **Step 1: Implement the route handler**

Create `app/api/webhooks/stripe/route.ts`:
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaymentService } from "@/lib/integrations/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rawBody = await req.text(); // raw body required for signature verification
  const signature = req.headers.get("stripe-signature");

  const result = getPaymentService().verifyWebhook(rawBody, signature);
  if (!result) {
    // Bad signature, simulated mode, or irrelevant event.
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (result.paymentId) {
    // Idempotent: only flip pending → paid once.
    await prisma.payments.updateMany({
      where: { id: result.paymentId, status: "pending" },
      data: {
        status: "paid",
        paid_at: new Date(),
        stripe_payment_intent: result.paymentIntent ?? null,
      },
    });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify idempotency logic is covered**

The mapping/idempotency logic lives in `parseCheckoutCompleted` (tested in Task 1) + the `updateMany({ where: { status: "pending" } })` guard. Re-run:
Run: `npx vitest run lib/integrations/__tests__/payments.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/stripe/route.ts
git commit -m "feat(payments): Stripe webhook to mark payments paid"
```

---

## Task 6: Admin payment panel on the séance detail page

Charline sees the payment status and can mark it paid manually (cash) or resend the link.

**Files:**
- Create: `app/admin/seances/[id]/payment-actions.ts`
- Create: `app/admin/seances/[id]/payment-panel.tsx`
- Modify: `app/admin/seances/[id]/page.tsx`

**Interfaces:**
- Consumes: `prisma.payments` (Task 2), `notifyBookingConfirmed`/email (existing), `paymentPublicUrl` (Task 3).
- Produces: `markPaidAction(paymentId: string): Promise<{ error?: string }>`, `resendLinkAction(paymentId: string): Promise<{ error?: string }>`.

- [ ] **Step 1: Implement the server actions**

Create `app/admin/seances/[id]/payment-actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paymentPublicUrl } from "@/lib/payments";
import { getEmailService, bookingConfirmedClientHtml } from "@/lib/integrations/email";

export async function markPaidAction(paymentId: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await prisma.payments.updateMany({
      where: { id: paymentId, status: "pending" },
      data: { status: "paid", paid_at: new Date() },
    });
    revalidatePath("/admin/seances");
    return {};
  } catch {
    return { error: "Impossible de marquer comme réglé." };
  }
}

export async function resendLinkAction(paymentId: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    const payment = await prisma.payments.findUnique({
      where: { id: paymentId },
      include: { profiles: true },
    });
    if (!payment) return { error: "Paiement introuvable." };
    if (!payment.profiles.email) return { error: "La cliente n'a pas d'email." };
    if (payment.status === "paid") return { error: "Déjà réglé." };

    const email = getEmailService({
      fromEmail: process.env.AUTH_EMAIL_FROM?.trim() || "cdsoimeme@gmail.com",
      fromName: "CD soi-même",
    });
    await email.send({
      to: payment.profiles.email,
      subject: "Régler ta séance — CD soi-même",
      html: bookingConfirmedClientHtml({
        businessName: "CD soi-même",
        clientName: payment.profiles.prenom ?? "",
        prestation: payment.label,
        dateLabel: "",
        intro: "Voici à nouveau le lien pour régler ta séance en ligne.",
        payUrl: paymentPublicUrl(payment.token),
      }),
    });
    return {};
  } catch {
    return { error: "Envoi impossible." };
  }
}
```

- [ ] **Step 2: Implement the panel component**

Create `app/admin/seances/[id]/payment-panel.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { markPaidAction, resendLinkAction } from "./payment-actions";

type Props = {
  paymentId: string;
  status: string;
  amountLabel: string;
  payUrl: string;
};

export function PaymentPanel({ paymentId, status, amountLabel, payUrl }: Props) {
  const [current, setCurrent] = useState(status);
  const [pending, start] = useTransition();

  const paid = current === "paid";

  return (
    <div className="mt-6 rounded-2xl border border-primary/10 bg-card/70 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-serif text-lg text-foreground">Paiement</p>
          <p className="text-sm text-foreground/60">{amountLabel}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {paid ? "Réglé" : "En attente"}
        </span>
      </div>

      {!paid && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await markPaidAction(paymentId);
                if (r.error) toast.error(r.error);
                else {
                  setCurrent("paid");
                  toast.success("Marqué comme réglé.");
                }
              })
            }
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Marquer comme réglé
          </button>
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await resendLinkAction(paymentId);
                if (r.error) toast.error(r.error);
                else toast.success("Lien renvoyé par email.");
              })
            }
            className="rounded-full border border-primary/20 px-4 py-2 text-sm text-foreground disabled:opacity-50"
          >
            Renvoyer le lien
          </button>
          <a
            href={payUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-primary/20 px-4 py-2 text-sm text-foreground"
          >
            Ouvrir le lien
          </a>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Render the panel on the séance detail page**

In `app/admin/seances/[id]/page.tsx`:

(a) Add imports:
```ts
import { paymentPublicUrl } from "@/lib/payments";
import { PaymentPanel } from "./payment-panel";
```

(b) After `if (!s) notFound();`, fetch the latest payment:
```ts
  const payment = await prisma.payments.findFirst({
    where: { seance_id: s.id },
    orderBy: { created_at: "desc" },
  });
```

(c) After the `<SeanceForm ... />` element (still inside the outer `<div>`), add:
```tsx
      {payment && (
        <PaymentPanel
          paymentId={payment.id}
          status={payment.status}
          amountLabel={(payment.amount_cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
          payUrl={paymentPublicUrl(payment.token)}
        />
      )}
```

- [ ] **Step 4: Typecheck + manual check**

Run: `npx tsc --noEmit`
Expected: no errors.
Manually: open a séance that has a payment in `/admin/seances/<id>` → panel shows "En attente" → "Marquer comme réglé" flips it to "Réglé".

- [ ] **Step 5: Commit**

```bash
git add app/admin/seances/[id]/payment-actions.ts app/admin/seances/[id]/payment-panel.tsx app/admin/seances/[id]/page.tsx
git commit -m "feat(payments): admin payment panel (mark paid, resend link)"
```

---

## Task 7: Espace self-pay

The cliente can pay confirmed unpaid séances from her space.

**Files:**
- Modify: `app/espace/page.tsx`

**Interfaces:**
- Consumes: `prisma.payments` (Task 2), `paymentPublicUrl` (Task 3).

- [ ] **Step 1: Fetch pending payments for the listed séances**

In `app/espace/page.tsx`:

(a) Add import:
```ts
import { paymentPublicUrl } from "@/lib/payments";
```

(b) After the `const [seances, demandes] = await Promise.all([...])` block, add:
```ts
  const seanceIds = seances.map((s) => s.id);
  const payments = seanceIds.length
    ? await prisma.payments.findMany({ where: { seance_id: { in: seanceIds } } })
    : [];
  const payBySeance = new Map(payments.map((p) => [p.seance_id, p]));
```

- [ ] **Step 2: Show the pay link / paid badge per séance**

Replace the `seances.map(...)` block with:
```tsx
          {seances.map((s) => {
            const pay = payBySeance.get(s.id);
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{s.type}</span>
                  <span className="text-sm text-foreground/70">{formatDateTime(s.date)}</span>
                </span>
                {pay && pay.status === "paid" && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Réglé ✓</span>
                )}
                {pay && pay.status === "pending" && (
                  <a
                    href={paymentPublicUrl(pay.token)}
                    className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Régler {(pay.amount_cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                  </a>
                )}
              </div>
            );
          })}
```

- [ ] **Step 3: Typecheck + manual check**

Run: `npx tsc --noEmit`
Expected: no errors.
Manually: as a logged-in cliente with a confirmed priced séance, `/espace` shows a "Régler XX €" button linking to `/regler/<token>`; after paying, it shows "Réglé ✓".

- [ ] **Step 4: Run full suite + commit**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS, no type errors.
```bash
git add app/espace/page.tsx
git commit -m "feat(payments): cliente self-pay from espace"
```

---

## Post-implementation: going live (manual, by the user)

Not code tasks — do these when ready to accept real payments:

1. Create a Stripe account; grab **test** keys (`sk_test_…`).
2. Put `STRIPE_SECRET_KEY=sk_test_…` in `.env`.
3. Local webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` → copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`.
4. Set `DEMO_MODE="false"` to exit simulation (this also switches **emails** to real Brevo sending — expected).
5. Test with card `4242 4242 4242 4242`, any future expiry/CVC.
6. Production: add both `STRIPE_*` vars in Vercel; create a webhook endpoint in the Stripe dashboard pointing at `https://<domain>/api/webhooks/stripe`, subscribe to `checkout.session.completed`, copy its signing secret into Vercel.
7. Flip to live keys (`sk_live_…`) when ready.

---

## Self-Review Notes

- **Spec coverage:** table (T2), pay-after-confirm + email link (T3), public checkout page (T4), webhook idempotent (T5), admin badge + mark-paid + resend (T6), espace self-pay (T7), simulated mode (T1), `prix` null → no payment (T3 `createSeancePayment` returns null). All spec sections covered.
- **Types consistent:** `createCheckoutSession`/`verifyWebhook`/`CheckoutParams`/`CheckoutSession` defined in T1 and used unchanged in T4/T5; `paymentPublicUrl`/`checkoutUrls`/`createSeancePayment` defined in T3 and consumed in T4/T6/T7; `payments` fields identical across schema (T2), SQL (T2), and all queries.
- **No `migrate dev`** anywhere; table created via `prisma db execute`.
