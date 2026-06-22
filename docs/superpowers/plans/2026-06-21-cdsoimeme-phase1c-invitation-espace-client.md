# CDSOIMEME Phase 1C — Client Invitation & Client Space — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Charline invite clientes by email; let an invited cliente set her password from a secure link; give each cliente a private space (`/espace`) showing only her own upcoming séances; and give Charline admin pages to create/list/view clientes and resend invitations.

**Architecture:** A cliente is a `User` with `role = CLIENT` (from Plan 1B). Inviting creates that user with a random `inviteToken` (+ expiry) and sends a Brevo email (simulated in DEMO_MODE) linking to `/invitation/[token]`. Accepting validates the token, hashes the chosen password, sets `passwordSetAt`, and clears the token. The client space is guarded by `requireClient()` and scopes every query to `clientId === session.user.id`. Pure helpers (`isInviteValid`, `upcomingSeancesWhere`) carry the security logic so it can be unit-tested without a database.

**Tech Stack:** Next.js 16.2.9 (async `params`/server actions), Prisma 7 + NeonDB, NextAuth v5, bcryptjs, Zod, Vitest, shadcn UI.

## Global Constraints

- This plan runs **inside `CDSOIMEMEV2`**, after Plans 1A and 1B. All paths relative to that root.
- Depends on Plan 1B: `Role.CLIENT`, `User` invitation fields, `Reservation.clientId`, `requireClient()`, role-based login redirect, and the seeded cliente with `inviteToken = "demo-invite-token-laurine"`.
- Next 16: dynamic route `params` and `searchParams` are **Promises** — `await` them. Read `node_modules/next/dist/docs/` if unsure.
- Data isolation is mandatory: never read a cliente's data without filtering by `clientId === session.user.id` on the server. Never trust a client-supplied id.
- Copy in French. Invite link base = `process.env.NEXTAUTH_URL ?? "http://localhost:3000"`.
- Run `npm test` before every commit; build stays green.

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `lib/invitations.ts` | Token generation, TTL, validity check, invite URL | Create |
| `lib/__tests__/invitations.test.ts` | Unit tests for the above | Create |
| `lib/auth-schema.ts` | Add `setPasswordSchema` | Modify |
| `lib/espace.ts` | `upcomingSeancesWhere(clientId, now)` (scoping helper) | Create |
| `lib/__tests__/espace-query.test.ts` | Asserts scoping by clientId | Create |
| `lib/integrations/email.ts` | `invitationEmailHtml` + optional shell footer | Modify |
| `lib/integrations/__tests__/invitation-email.test.ts` | Asserts link + name in HTML | Create |
| `app/admin/clientes/actions.ts` | Create cliente + (re)send invite | Create |
| `app/admin/clientes/page.tsx` | Clientes list | Create |
| `app/admin/clientes/new/page.tsx` + `new-cliente-form.tsx` | Create-cliente form | Create |
| `app/admin/clientes/[id]/page.tsx` | Cliente detail + séances + resend invite | Create |
| `components/admin/sidebar.tsx` | Add « Clientes » nav link | Modify |
| `app/invitation/[token]/page.tsx` + `set-password-form.tsx` | Accept invite / set password | Create |
| `app/invitation/actions.ts` | `setPasswordAction` | Create |
| `app/espace/layout.tsx` | `requireClient` guard + header/logout | Create |
| `app/espace/actions.ts` | Client `logoutAction` | Create |
| `app/espace/page.tsx` | Client dashboard (own upcoming séances) | Create |

---

### Task 1: Invitation token utilities

**Files:**
- Create: `lib/invitations.ts`
- Test: `lib/__tests__/invitations.test.ts`

**Interfaces:**
- Produces:
  - `generateInviteToken(): string` — 64-hex-char random token.
  - `INVITE_TTL_MS: number` — 7 days in ms.
  - `inviteUrl(token: string): string` — absolute URL to `/invitation/<token>`.
  - `isInviteValid(u: { passwordSetAt: Date | null; inviteToken: string | null; inviteTokenExpiresAt: Date | null }, now: Date): boolean`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/invitations.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { generateInviteToken, INVITE_TTL_MS, inviteUrl, isInviteValid } from "@/lib/invitations";

describe("generateInviteToken", () => {
  it("returns 64 hex chars, unique per call", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});

describe("inviteUrl", () => {
  it("builds an /invitation/<token> URL", () => {
    expect(inviteUrl("abc")).toMatch(/\/invitation\/abc$/);
  });
});

describe("isInviteValid", () => {
  const now = new Date("2026-06-21T12:00:00Z");
  const future = new Date(now.getTime() + INVITE_TTL_MS);
  const past = new Date(now.getTime() - 1000);

  it("true for a fresh, unused token", () => {
    expect(isInviteValid({ passwordSetAt: null, inviteToken: "t", inviteTokenExpiresAt: future }, now)).toBe(true);
  });
  it("false when already activated", () => {
    expect(isInviteValid({ passwordSetAt: now, inviteToken: "t", inviteTokenExpiresAt: future }, now)).toBe(false);
  });
  it("false when expired", () => {
    expect(isInviteValid({ passwordSetAt: null, inviteToken: "t", inviteTokenExpiresAt: past }, now)).toBe(false);
  });
  it("false when no token", () => {
    expect(isInviteValid({ passwordSetAt: null, inviteToken: null, inviteTokenExpiresAt: future }, now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/__tests__/invitations.test.ts`
Expected: FAIL — module `@/lib/invitations` not found.

- [ ] **Step 3: Implement `lib/invitations.ts`**

```ts
import { randomBytes } from "crypto";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export function inviteUrl(token: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/invitation/${token}`;
}

export function isInviteValid(
  u: { passwordSetAt: Date | null; inviteToken: string | null; inviteTokenExpiresAt: Date | null },
  now: Date
): boolean {
  if (!u.inviteToken) return false;
  if (u.passwordSetAt) return false;
  if (!u.inviteTokenExpiresAt) return false;
  return u.inviteTokenExpiresAt.getTime() > now.getTime();
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/__tests__/invitations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/invitations.ts lib/__tests__/invitations.test.ts
git commit -m "feat: invitation token utils (generate, ttl, validity)"
```

---

### Task 2: Password-set schema + scoping helper

**Files:**
- Modify: `lib/auth-schema.ts`
- Create: `lib/espace.ts`
- Test: `lib/__tests__/espace-query.test.ts`

**Interfaces:**
- Produces:
  - `setPasswordSchema` — `{ password: string(min 8), confirm: string }` refined so `password === confirm`.
  - `upcomingSeancesWhere(clientId: string, now: Date)` → Prisma `where` object scoped to that cliente's upcoming PENDING/CONFIRMED séances.

- [ ] **Step 1: Write the failing test for the scoping helper**

Create `lib/__tests__/espace-query.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { upcomingSeancesWhere } from "@/lib/espace";

describe("upcomingSeancesWhere", () => {
  const now = new Date("2026-06-21T12:00:00Z");
  it("scopes strictly to the given clientId", () => {
    const w = upcomingSeancesWhere("client-123", now);
    expect(w.clientId).toBe("client-123");
  });
  it("only future PENDING/CONFIRMED séances", () => {
    const w = upcomingSeancesWhere("client-123", now);
    expect(w.status).toEqual({ in: ["PENDING", "CONFIRMED"] });
    expect(w.startAt).toEqual({ gte: now });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/__tests__/espace-query.test.ts`
Expected: FAIL — module `@/lib/espace` not found.

- [ ] **Step 3: Create `lib/espace.ts`**

```ts
import type { Prisma } from "@prisma/client";

/** The ONLY way /espace reads séances: always scoped to the logged-in cliente. */
export function upcomingSeancesWhere(clientId: string, now: Date): Prisma.ReservationWhereInput {
  return {
    clientId,
    status: { in: ["PENDING", "CONFIRMED"] },
    startAt: { gte: now },
  };
}
```

- [ ] **Step 4: Add `setPasswordSchema` to `lib/auth-schema.ts`**

Append:
```ts
export const setPasswordSchema = z
  .object({
    password: z.string().min(8, "8 caractères minimum"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
```

- [ ] **Step 5: Run to verify it passes + typecheck**

Run: `npx vitest run lib/__tests__/espace-query.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add lib/espace.ts lib/auth-schema.ts lib/__tests__/espace-query.test.ts
git commit -m "feat: set-password schema + clientId-scoped séances query helper"
```

---

### Task 3: Invitation email template

**Files:**
- Modify: `lib/integrations/email.ts`
- Test: `lib/integrations/__tests__/invitation-email.test.ts`

**Interfaces:**
- Consumes: existing `emailShell`, `para` helpers.
- Produces: `invitationEmailHtml(p: { businessName: string; clientName: string; url: string }): string` — branded HTML containing a call-to-action button linking to `p.url`.

- [ ] **Step 1: Write the failing test**

Create `lib/integrations/__tests__/invitation-email.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { invitationEmailHtml } from "@/lib/integrations/email";

describe("invitationEmailHtml", () => {
  it("includes the client name and invite link", () => {
    const html = invitationEmailHtml({
      businessName: "CD soi-même",
      clientName: "Marie",
      url: "http://localhost:3000/invitation/xyz",
    });
    expect(html).toContain("Marie");
    expect(html).toContain("http://localhost:3000/invitation/xyz");
    expect(html).toContain("CD soi-même");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/integrations/__tests__/invitation-email.test.ts`
Expected: FAIL — `invitationEmailHtml` is not exported.

- [ ] **Step 3: Parametrise the shell footer and add the template in `lib/integrations/email.ts`**

In `emailShell`, make the footer overridable. Change the opts type to add `footer?: string` and use it:
```ts
function emailShell(opts: {
  businessName: string;
  badge: string;
  accent: string;
  heading: string;
  body: string;
  footer?: string;
}): string {
```
and replace the footer cell content:
```ts
        <tr><td style="padding:16px 28px;border-top:1px solid ${C.muted};font:400 12px/1.5 ${SANS};color:${SUBTLE};">
          ${opts.footer ?? `${opts.businessName} — cet email vous a été envoyé suite à votre réservation.`}
        </td></tr>
```
Then add, after `para(...)` helper, a button helper and the template:
```ts
function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;"><tr><td style="border-radius:999px;background:${C.primary};">
    <a href="${url}" style="display:inline-block;padding:13px 26px;font:600 15px/1 ${SANS};color:#ffffff;text-decoration:none;border-radius:999px;">${label}</a>
  </td></tr></table>`;
}

export function invitationEmailHtml(p: {
  businessName: string;
  clientName: string;
  url: string;
}): string {
  return emailShell({
    businessName: p.businessName,
    badge: "Invitation",
    accent: C.primary,
    heading: `Bienvenue ${p.clientName} ✨`,
    footer: `${p.businessName} — vous avez reçu cet email car votre praticienne vous a ouvert un espace.`,
    body:
      para(`Votre praticienne vous a créé un espace personnel et sécurisé chez <strong>${p.businessName}</strong>.`) +
      para("Cliquez ci-dessous pour choisir votre mot de passe et accéder à votre espace.") +
      button("Activer mon espace", p.url) +
      para(`<span style="color:${SUBTLE};font-size:13px;">Ce lien est valable 7 jours. S'il a expiré, demandez une nouvelle invitation.</span>`),
  });
}
```

- [ ] **Step 4: Run to verify it passes + full suite**

Run: `npx vitest run lib/integrations/__tests__/invitation-email.test.ts && npm test`
Expected: new test PASS; existing email tests still PASS (footer default unchanged).

- [ ] **Step 5: Commit**

```bash
git add lib/integrations/email.ts lib/integrations/__tests__/invitation-email.test.ts
git commit -m "feat: branded invitation email template"
```

---

### Task 4: Admin actions — create cliente & (re)send invitation

**Files:**
- Create: `app/admin/clientes/actions.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `prisma`, `generateInviteToken`, `INVITE_TTL_MS`, `inviteUrl`, `getEmailService`, `invitationEmailHtml`.
- Produces:
  - `createClienteAction(formData: FormData): Promise<{ error?: string }>` — validates name+email, creates a `CLIENT` user with a fresh token, sends the invite email, then `redirect("/admin/clientes")`.
  - `resendInviteAction(id: string): Promise<{ error?: string }>` — regenerates the token + resends (only while not yet activated).

- [ ] **Step 1: Create `app/admin/clientes/actions.ts`**

```ts
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateInviteToken, INVITE_TTL_MS, inviteUrl } from "@/lib/invitations";
import { getEmailService } from "@/lib/integrations/email";
import { invitationEmailHtml } from "@/lib/integrations/email";

const clienteSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
});

async function sendInvite(user: { id: string; name: string | null; email: string }, token: string) {
  const settings = await prisma.settings.findFirst();
  const businessName = settings?.businessName ?? "CD soi-même";
  const fromEmail = settings?.fromEmail ?? "no-reply@cdsoimeme.fr";
  const email = getEmailService({ fromEmail, fromName: businessName });
  await email.send({
    to: user.email,
    toName: user.name ?? undefined,
    subject: `Votre espace ${businessName}`,
    html: invitationEmailHtml({ businessName, clientName: user.name ?? "", url: inviteUrl(token) }),
  });
}

export async function createClienteAction(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = clienteSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const token = generateInviteToken();
  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        role: "CLIENT",
        inviteToken: token,
        inviteTokenExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
        inviteSentAt: new Date(),
      },
    });
    await sendInvite(user, token);
  } catch {
    return { error: "Cet email est déjà utilisé." };
  }
  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}

export async function resendInviteAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "CLIENT") return { error: "Cliente introuvable." };
  if (user.passwordSetAt) return { error: "Cette cliente a déjà activé son espace." };

  const token = generateInviteToken();
  await prisma.user.update({
    where: { id },
    data: {
      inviteToken: token,
      inviteTokenExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
      inviteSentAt: new Date(),
    },
  });
  await sendInvite(user, token);
  revalidatePath(`/admin/clientes/${id}`);
  return {};
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: passes (pages for `/admin/clientes` come in Task 5; actions compile standalone).

- [ ] **Step 3: Commit**

```bash
git add app/admin/clientes/actions.ts
git commit -m "feat: admin actions to create cliente and send/resend invitation"
```

---

### Task 5: Admin clientes pages + nav link

**Files:**
- Create: `app/admin/clientes/page.tsx`
- Create: `app/admin/clientes/new/page.tsx`, `app/admin/clientes/new/new-cliente-form.tsx`
- Create: `app/admin/clientes/[id]/page.tsx`
- Modify: `components/admin/sidebar.tsx`

**Interfaces:**
- Consumes: `createClienteAction`, `resendInviteAction`, `prisma`, `requireAdmin`, `upcomingSeancesWhere` (reused for the cliente's séances), `formatDateRange`.
- Produces: admin screens to list clientes, create one, and view one (with her séances + a resend-invite control). « Clientes » appears in the sidebar.

- [ ] **Step 1: Create the clientes list `app/admin/clientes/page.tsx`**

```tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ClientesPage() {
  await requireAdmin();
  const clientes = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, passwordSetAt: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Clientes</h1>
        <Link href="/admin/clientes/new" className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          Inviter une cliente
        </Link>
      </div>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>{clientes.length} cliente(s)</CardTitle></CardHeader>
        <CardContent>
          {clientes.length === 0 ? (
            <p className="text-foreground/50">Aucune cliente pour le moment.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Nom</TableHead><TableHead>Email</TableHead><TableHead>Statut</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/admin/clientes/${c.id}`} className="font-medium hover:underline">
                        {c.name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-foreground/70">{c.email}</TableCell>
                    <TableCell>
                      {c.passwordSetAt ? <Badge>Active</Badge> : <Badge variant="secondary">Invitée</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create the form client component `app/admin/clientes/new/new-cliente-form.tsx`**

```tsx
"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createClienteAction } from "@/app/admin/clientes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewClienteForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await createClienteAction(fd);
          if (res?.error) setError(res.error);
          else router.push("/admin/clientes");
        })
      }
      className="max-w-md space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Nom de la cliente</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Téléphone (optionnel)</Label>
        <Input id="phone" name="phone" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Créer et envoyer l'invitation"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create the new-cliente page `app/admin/clientes/new/page.tsx`**

```tsx
import { requireAdmin } from "@/lib/auth";
import { NewClienteForm } from "./new-cliente-form";

export default async function NewClientePage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Inviter une cliente</h1>
      <p className="text-foreground/60">
        Elle recevra un email pour activer son espace personnel et sécurisé.
      </p>
      <NewClienteForm />
    </div>
  );
}
```

- [ ] **Step 4: Create the cliente detail page `app/admin/clientes/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateRange } from "@/lib/utils";
import { resendInviteAction } from "@/app/admin/clientes/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const cliente = await prisma.user.findFirst({
    where: { id, role: "CLIENT" },
    include: {
      reservations: { orderBy: { startAt: "asc" }, include: { resource: true } },
    },
  });
  if (!cliente) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-3xl">{cliente.name ?? cliente.email}</h1>
        {cliente.passwordSetAt ? <Badge>Active</Badge> : <Badge variant="secondary">Invitée</Badge>}
      </div>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Coordonnées</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-foreground/60">Email :</span> {cliente.email}</p>
          {cliente.phone && <p><span className="text-foreground/60">Téléphone :</span> {cliente.phone}</p>}
          {!cliente.passwordSetAt && (
            <form action={async () => { "use server"; await resendInviteAction(cliente.id); }} className="pt-3">
              <Button type="submit" variant="secondary">Renvoyer l'invitation</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Séances</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {cliente.reservations.length === 0 && <p className="text-foreground/50">Aucune séance.</p>}
          {cliente.reservations.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted">
              <span className="font-medium">{r.resource.name}</span>
              <span className="text-sm text-foreground/60">{formatDateRange(r.startAt, r.endAt)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Add « Clientes » to `components/admin/sidebar.tsx`**

Insert into the `links` array, right after the `"/admin"` entry:
```tsx
  { href: "/admin/clientes", label: "Clientes" },
```

- [ ] **Step 6: Build + smoke-test**

Run: `npm run build`
Then `npm run dev`, log in as `charline@cdsoimeme.fr`:
- `/admin/clientes` lists Marie, Corène (Active) and Laurine (Invitée).
- `/admin/clientes/new` → create a test cliente → console prints the simulated invite email (`📧 [SIMULÉ]`), redirect to the list.
- Open Laurine → « Renvoyer l'invitation » prints a new simulated email.
Stop the server.

- [ ] **Step 7: Commit**

```bash
git add "app/admin/clientes" components/admin/sidebar.tsx
git commit -m "feat: admin clientes list/create/detail + nav link"
```

---

### Task 6: Invitation acceptance (set password)

**Files:**
- Create: `app/invitation/actions.ts`
- Create: `app/invitation/[token]/page.tsx`, `app/invitation/[token]/set-password-form.tsx`

**Interfaces:**
- Consumes: `setPasswordSchema`, `isInviteValid`, `prisma`, bcrypt.
- Produces:
  - `setPasswordAction(prev, formData): Promise<{ error?: string } | undefined>` — validates token + password, hashes it, sets `passwordSetAt`, clears the token, then `redirect("/login")`.
  - A public page at `/invitation/[token]` showing the form for a valid token, or an « expired/invalid » message otherwise.

- [ ] **Step 1: Create `app/invitation/actions.ts`**

```ts
"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { setPasswordSchema } from "@/lib/auth-schema";
import { isInviteValid } from "@/lib/invitations";

export type SetPasswordState = { error?: string } | undefined;

export async function setPasswordAction(
  _prev: SetPasswordState,
  formData: FormData
): Promise<SetPasswordState> {
  const token = String(formData.get("token") || "");
  const parsed = setPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Mot de passe invalide." };

  const user = await prisma.user.findUnique({ where: { inviteToken: token } });
  if (!user || !isInviteValid(user, new Date())) {
    return { error: "Lien d'invitation invalide ou expiré." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(parsed.data.password, 10),
      passwordSetAt: new Date(),
      inviteToken: null,
      inviteTokenExpiresAt: null,
    },
  });
  redirect("/login");
}
```

- [ ] **Step 2: Create the form `app/invitation/[token]/set-password-form.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { setPasswordAction, type SetPasswordState } from "@/app/invitation/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<SetPasswordState, FormData>(
    setPasswordAction,
    undefined
  );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="password">Choisissez un mot de passe</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmez le mot de passe</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={8} />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Activation…" : "Activer mon espace"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create the page `app/invitation/[token]/page.tsx`**

```tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { isInviteValid } from "@/lib/invitations";
import { theme } from "@/lib/theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SetPasswordForm } from "./set-password-form";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await prisma.user.findUnique({ where: { inviteToken: token } });
  const valid = user ? isInviteValid(user, new Date()) : false;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm rounded-lg">
        <CardHeader>
          <CardTitle className="font-display text-2xl">{theme.business.name}</CardTitle>
          <p className="text-sm text-foreground/60">
            {valid ? `Bienvenue ${user?.name ?? ""} — activez votre espace` : "Invitation"}
          </p>
        </CardHeader>
        <CardContent>
          {valid ? (
            <SetPasswordForm token={token} />
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-red-600">Ce lien d'invitation est invalide ou a expiré.</p>
              <p className="text-foreground/60">
                Demandez une nouvelle invitation à votre praticienne, puis{" "}
                <Link href="/login" className="text-primary underline">connectez-vous</Link>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 4: Build + smoke-test the full invite loop**

Run: `npm run build`, then `npm run dev`:
- Open `/invitation/demo-invite-token-laurine` (seeded pending cliente) → form shown → set password `motdepasse` twice → redirected to `/login`.
- Log in as `laurine@exemple.fr` / `motdepasse` → lands on `/espace` (built in Task 7; until then it 404s — acceptable, the redirect target is correct).
- Open `/invitation/demo-invite-token-laurine` again → now shows « invalide ou expiré » (token consumed).
Stop the server.

- [ ] **Step 5: Commit**

```bash
git add app/invitation
git commit -m "feat: invitation acceptance page + set-password action"
```

---

### Task 7: Client space (`/espace`)

**Files:**
- Create: `app/espace/actions.ts`
- Create: `app/espace/layout.tsx`
- Create: `app/espace/page.tsx`

**Interfaces:**
- Consumes: `requireClient`, `prisma`, `upcomingSeancesWhere`, `formatDateRange`, `signOut`.
- Produces: a guarded client area; the dashboard lists only the logged-in cliente's upcoming séances and shows « bientôt » placeholders for Documents/Messagerie (Phases 2–4).

- [ ] **Step 1: Create the client logout action `app/espace/actions.ts`**

```ts
"use server";

import { signOut } from "@/lib/auth";

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
```

- [ ] **Step 2: Create the guard + shell `app/espace/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { theme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { logoutAction } from "./actions";

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/admin"); // une praticienne n'a rien à faire ici

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-muted bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <span className="font-display text-lg font-semibold">{theme.business.name}</span>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">Partir en douceur</Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create the dashboard `app/espace/page.tsx`**

```tsx
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { upcomingSeancesWhere } from "@/lib/espace";
import { formatDateRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EspacePage() {
  const session = await requireClient();
  const clientId = session.user.id;

  const seances = await prisma.reservation.findMany({
    where: upcomingSeancesWhere(clientId, new Date()),
    orderBy: { startAt: "asc" },
    include: { resource: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Bienvenue ✨</h1>
        <p className="text-foreground/60">Votre espace de soin et d'accompagnement.</p>
      </div>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Mes prochaines séances</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {seances.length === 0 ? (
            <p className="text-foreground/50">Aucune séance à venir pour le moment.</p>
          ) : (
            seances.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="font-medium">{s.resource.name}</span>
                <span className="text-sm text-foreground/70">{formatDateRange(s.startAt, s.endAt)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-lg opacity-60">
          <CardHeader><CardTitle className="text-base">Mes documents</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-foreground/50">Bientôt disponible</p></CardContent>
        </Card>
        <Card className="rounded-lg opacity-60">
          <CardHeader><CardTitle className="text-base">Messagerie</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-foreground/50">Bientôt disponible</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build + smoke-test data isolation**

Run: `npm test && npm run build`, then `npm run dev`:
- Log in as `marie@exemple.fr` / `demo1234` → `/espace` shows **only Marie's** séances (Coaching, Réflexologie) — not Corène's.
- Log in as `corene@exemple.fr` / `demo1234` → shows only Corène's upcoming séance.
- Try visiting `/espace` while logged in as `charline@cdsoimeme.fr` → redirected to `/admin`.
- Try `/admin` while logged in as Marie → redirected to `/login` (admin layout guard) — confirms role separation.
Stop the server.

- [ ] **Step 5: Commit**

```bash
git add app/espace
git commit -m "feat: secure client space with own upcoming séances"
```

---

## Self-Review

- **Spec coverage (Phase 1 §Flux d'invitation + §Espace cliente + §Tests):**
  - Token generation/consumption/expiry → Task 1 (`isInviteValid`, tested) + Task 6 (consume on accept).
  - Invitation email → Task 3; admin create/resend → Tasks 4–5.
  - `/invitation/[token]` acceptance → Task 6.
  - Client space showing only own séances → Task 7, with the scoping guaranteed by `upcomingSeancesWhere` (Task 2, tested) and `requireClient`.
  - Role isolation (cliente can't reach `/admin`, praticienne redirected out of `/espace`) → Tasks 5–7 + Plan 1B guards.
- **Placeholder scan:** No TODO/TBD. The Documents/Messagerie cards are intentional « Bientôt disponible » placeholders for Phases 2–4, not unfinished work.
- **Type consistency:** `setPasswordAction` signature matches `useActionState` usage; `isInviteValid` is called with the same `{ passwordSetAt, inviteToken, inviteTokenExpiresAt }` shape in the action, the page, and its test; `upcomingSeancesWhere(clientId, now)` returns a `Prisma.ReservationWhereInput` used identically in the test and `/espace/page.tsx`; `resendInviteAction`/`createClienteAction` return `{ error?: string }` consumed by the form and the server-action button.

## Phase 1 complete after this plan

With 1A + 1B + 1C done, CD soi-même has: the brand + two-portal landing, prestations/séances data, multi-role auth, clientes invited by email with a secure activation link, and a private client space showing each cliente's own upcoming séances. Phases 2–5 (questionnaires, documents, messagerie, réservation en ligne) each get their own spec → plan next.
