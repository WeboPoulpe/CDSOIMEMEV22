# Réservation Multi-Espaces — Plan Phase 2 : Cœur métier & flux de réservation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter le moteur de réservation (disponibilité + tarifs + anti-double-réservation transactionnel), le CRUD admin (espaces, tarifs, fermetures), et le flux public complet (liste → page espace → formulaire → confirmation) avec validation/refus admin.

**Architecture:** Logique métier pure et testable dans `lib/booking/`. Mutations via Server Actions validées par Zod. Anti-double-résa garanti par transaction Prisma. Flux public en Server Actions (embeddable). Statut conditionnel selon `requiresValidation`.

**Tech Stack:** Next.js 15 Server Actions, Prisma, Zod, date-fns, shadcn/ui, Vitest.

**Prérequis:** Phase 1 terminée (schéma, seed, auth, shell admin, thème).

**Spec de référence:** [docs/superpowers/specs/2026-06-17-resa-multi-espaces-design.md](../specs/2026-06-17-resa-multi-espaces-design.md)

## Global Constraints

- Montants en **centimes (Int)**. `totalCents` calculé serveur, jamais fait confiance au client.
- Chevauchement : `existing.startAt < slot.endAt AND existing.endAt > slot.startAt` (bornes jointives = pas de chevauchement).
- Réservations actives comptées pour la dispo = statut `PENDING` + `CONFIRMED`.
- Création + vérification capacity TOUJOURS dans une transaction Prisma `$transaction`.
- Toutes les entrées publiques validées par Zod avant écriture.
- `requiresValidation = true` → `PENDING` ; `false` → `CONFIRMED` (workflow complet branché en Phase 3 ; en Phase 2, juste le passage de statut).

---

## File Structure (Phase 2)

| Fichier | Responsabilité |
|---------|----------------|
| `lib/booking/pricing.ts` | Calcul `totalCents` (pure) |
| `lib/booking/availability.ts` | Calcul dispo + comptage chevauchements |
| `lib/booking/slots.ts` | Génération des créneaux proposés par unité |
| `lib/booking/schema.ts` | Schémas Zod (ReservationInput, etc.) |
| `lib/booking/errors.ts` | `SlotUnavailableError` |
| `lib/booking/__tests__/*.test.ts` | Tests unitaires moteur |
| `lib/booking/create-reservation.ts` | Transaction de création (réutilisée public + admin) |
| `app/(public)/actions.ts` | Server Action publique `createReservationAction` |
| `app/(public)/layout.tsx`, `page.tsx` | Layout public + accueil |
| `app/(public)/reserver/[slug]/page.tsx` | Page espace |
| `app/(public)/reserver/[slug]/confirmation/page.tsx` | Confirmation |
| `components/public/*` | ResourceCard, BookingForm, SlotPicker |
| `app/admin/espaces/*` | CRUD espaces + tarifs |
| `app/admin/fermetures/*` | CRUD fermetures |
| `app/admin/reservations/*` | Liste + détail + valider/refuser |
| `lib/booking/admin-schema.ts` | Schémas Zod admin (resource, pricing, closedPeriod) |

---

## Task 1: Calcul de tarif (TDD)

**Files:**
- Create: `lib/booking/pricing.ts`, `lib/booking/__tests__/pricing.test.ts`

**Interfaces:**
- Produces:
  - `computeTotalCents(input: { unit: BookingUnit; priceCents: number; startAt: Date; endAt: Date }): number`
  - Lève `Error("Unité non tarifée")` si `priceCents` indéfini/null.

- [ ] **Step 1: Écrire les tests qui échouent**

Create `lib/booking/__tests__/pricing.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeTotalCents } from "@/lib/booking/pricing";

const d = (s: string) => new Date(s);

describe("computeTotalCents", () => {
  it("HOUR: prix × nb heures", () => {
    expect(computeTotalCents({ unit: "HOUR", priceCents: 3000, startAt: d("2026-06-17T10:00"), endAt: d("2026-06-17T13:00") })).toBe(9000);
  });
  it("HALF_DAY: prix × nb de tranches de 4h", () => {
    expect(computeTotalCents({ unit: "HALF_DAY", priceCents: 9000, startAt: d("2026-06-17T09:00"), endAt: d("2026-06-17T13:00") })).toBe(9000);
  });
  it("DAY: prix × nb jours", () => {
    expect(computeTotalCents({ unit: "DAY", priceCents: 2500, startAt: d("2026-06-17T09:00"), endAt: d("2026-06-17T18:00") })).toBe(2500);
  });
  it("DAY: deux jours", () => {
    expect(computeTotalCents({ unit: "DAY", priceCents: 2500, startAt: d("2026-06-17T09:00"), endAt: d("2026-06-18T18:00") })).toBe(5000);
  });
  it("MONTH: prix × nb mois", () => {
    expect(computeTotalCents({ unit: "MONTH", priceCents: 45000, startAt: d("2026-06-01T00:00"), endAt: d("2026-07-01T00:00") })).toBe(45000);
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- pricing`
Expected: FAIL — `computeTotalCents is not a function`.

- [ ] **Step 3: Implémenter**

Create `lib/booking/pricing.ts`:
```ts
import type { BookingUnit } from "@prisma/client";

const MS_HOUR = 1000 * 60 * 60;

export function computeTotalCents(input: {
  unit: BookingUnit;
  priceCents: number;
  startAt: Date;
  endAt: Date;
}): number {
  const { unit, priceCents, startAt, endAt } = input;
  if (priceCents == null) throw new Error("Unité non tarifée");
  const ms = endAt.getTime() - startAt.getTime();
  if (ms <= 0) throw new Error("Plage horaire invalide");

  switch (unit) {
    case "HOUR": {
      const hours = Math.ceil(ms / MS_HOUR);
      return priceCents * hours;
    }
    case "HALF_DAY": {
      const halfDays = Math.ceil(ms / (MS_HOUR * 4));
      return priceCents * halfDays;
    }
    case "DAY": {
      const days = Math.ceil(ms / (MS_HOUR * 24));
      return priceCents * Math.max(1, days);
    }
    case "MONTH": {
      const months = Math.max(
        1,
        (endAt.getFullYear() - startAt.getFullYear()) * 12 +
          (endAt.getMonth() - startAt.getMonth())
      );
      return priceCents * months;
    }
    default:
      throw new Error(`Unité inconnue: ${unit}`);
  }
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npm test -- pricing`
Expected: tous PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/booking/pricing.ts lib/booking/__tests__/pricing.test.ts
git commit -m "feat: reservation total pricing calculation"
```

---

## Task 2: Logique de chevauchement & disponibilité (TDD)

**Files:**
- Create: `lib/booking/availability.ts`, `lib/booking/__tests__/availability.test.ts`

**Interfaces:**
- Produces:
  - `overlaps(a: {startAt: Date; endAt: Date}, b: {startAt: Date; endAt: Date}): boolean`
  - `isSlotAvailable(params: { capacity: number; activeCount: number; closed: boolean }): boolean` — fonction pure, le comptage DB est fait par l'appelant.

- [ ] **Step 1: Écrire les tests qui échouent**

Create `lib/booking/__tests__/availability.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { overlaps, isSlotAvailable } from "@/lib/booking/availability";

const d = (s: string) => new Date(s);

describe("overlaps", () => {
  it("true when ranges intersect", () => {
    expect(overlaps(
      { startAt: d("2026-06-17T10:00"), endAt: d("2026-06-17T12:00") },
      { startAt: d("2026-06-17T11:00"), endAt: d("2026-06-17T13:00") }
    )).toBe(true);
  });
  it("false when ranges only touch at the boundary", () => {
    expect(overlaps(
      { startAt: d("2026-06-17T10:00"), endAt: d("2026-06-17T12:00") },
      { startAt: d("2026-06-17T12:00"), endAt: d("2026-06-17T14:00") }
    )).toBe(false);
  });
  it("false when ranges are disjoint", () => {
    expect(overlaps(
      { startAt: d("2026-06-17T10:00"), endAt: d("2026-06-17T11:00") },
      { startAt: d("2026-06-17T13:00"), endAt: d("2026-06-17T14:00") }
    )).toBe(false);
  });
});

describe("isSlotAvailable", () => {
  it("available when active count below capacity", () => {
    expect(isSlotAvailable({ capacity: 8, activeCount: 3, closed: false })).toBe(true);
  });
  it("unavailable when at capacity", () => {
    expect(isSlotAvailable({ capacity: 1, activeCount: 1, closed: false })).toBe(false);
  });
  it("unavailable when closed regardless of capacity", () => {
    expect(isSlotAvailable({ capacity: 8, activeCount: 0, closed: true })).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- availability`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

Create `lib/booking/availability.ts`:
```ts
export function overlaps(
  a: { startAt: Date; endAt: Date },
  b: { startAt: Date; endAt: Date }
): boolean {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}

export function isSlotAvailable(params: {
  capacity: number;
  activeCount: number;
  closed: boolean;
}): boolean {
  if (params.closed) return false;
  return params.activeCount < params.capacity;
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npm test -- availability`
Expected: tous PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/booking/availability.ts lib/booking/__tests__/availability.test.ts
git commit -m "feat: overlap and slot-availability logic"
```

---

## Task 3: Génération de créneaux par unité (TDD)

**Files:**
- Create: `lib/booking/slots.ts`, `lib/booking/__tests__/slots.test.ts`

**Interfaces:**
- Produces:
  - `slotForUnit(unit: BookingUnit, date: Date, opts?: { hour?: number; half?: "AM" | "PM" }): { startAt: Date; endAt: Date }`
  - `HALF_DAY` AM = 09:00–13:00, PM = 14:00–18:00 ; `DAY` = 09:00–18:00 ; `HOUR` = [hour, hour+1] ; `MONTH` = [1er du mois, 1er du mois suivant].

- [ ] **Step 1: Écrire les tests qui échouent**

Create `lib/booking/__tests__/slots.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { slotForUnit } from "@/lib/booking/slots";

describe("slotForUnit", () => {
  it("DAY spans 09:00 to 18:00", () => {
    const s = slotForUnit("DAY", new Date("2026-06-17T00:00"));
    expect(s.startAt.getHours()).toBe(9);
    expect(s.endAt.getHours()).toBe(18);
  });
  it("HALF_DAY AM spans 09:00 to 13:00", () => {
    const s = slotForUnit("HALF_DAY", new Date("2026-06-17T00:00"), { half: "AM" });
    expect(s.startAt.getHours()).toBe(9);
    expect(s.endAt.getHours()).toBe(13);
  });
  it("HALF_DAY PM spans 14:00 to 18:00", () => {
    const s = slotForUnit("HALF_DAY", new Date("2026-06-17T00:00"), { half: "PM" });
    expect(s.startAt.getHours()).toBe(14);
    expect(s.endAt.getHours()).toBe(18);
  });
  it("HOUR spans one hour from given hour", () => {
    const s = slotForUnit("HOUR", new Date("2026-06-17T00:00"), { hour: 10 });
    expect(s.startAt.getHours()).toBe(10);
    expect(s.endAt.getHours()).toBe(11);
  });
  it("MONTH spans first of month to first of next month", () => {
    const s = slotForUnit("MONTH", new Date("2026-06-17T00:00"));
    expect(s.startAt.getDate()).toBe(1);
    expect(s.startAt.getMonth()).toBe(5); // juin = 5
    expect(s.endAt.getMonth()).toBe(6);   // juillet = 6
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- slots`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

Create `lib/booking/slots.ts`:
```ts
import type { BookingUnit } from "@prisma/client";

export function slotForUnit(
  unit: BookingUnit,
  date: Date,
  opts?: { hour?: number; half?: "AM" | "PM" }
): { startAt: Date; endAt: Date } {
  const base = new Date(date);
  const at = (h: number) => {
    const d = new Date(base);
    d.setHours(h, 0, 0, 0);
    return d;
  };
  switch (unit) {
    case "HOUR": {
      const h = opts?.hour ?? 9;
      return { startAt: at(h), endAt: at(h + 1) };
    }
    case "HALF_DAY": {
      return opts?.half === "PM"
        ? { startAt: at(14), endAt: at(18) }
        : { startAt: at(9), endAt: at(13) };
    }
    case "DAY": {
      return { startAt: at(9), endAt: at(18) };
    }
    case "MONTH": {
      const start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 1, 0, 0, 0, 0);
      return { startAt: start, endAt: end };
    }
  }
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npm test -- slots`
Expected: tous PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/booking/slots.ts lib/booking/__tests__/slots.test.ts
git commit -m "feat: slot generation by booking unit"
```

---

## Task 4: Schémas Zod & erreurs métier

**Files:**
- Create: `lib/booking/errors.ts`, `lib/booking/schema.ts`

**Interfaces:**
- Produces:
  - `SlotUnavailableError` (classe).
  - `reservationInputSchema` (Zod) → `{ resourceId, unit, startAt, endAt, customerName, customerEmail, customerPhone?, company?, message? }`.
  - `ReservationInput` (type).

- [ ] **Step 1: Erreur métier**

Create `lib/booking/errors.ts`:
```ts
export class SlotUnavailableError extends Error {
  constructor(message = "Ce créneau n'est plus disponible.") {
    super(message);
    this.name = "SlotUnavailableError";
  }
}
```

- [ ] **Step 2: Schéma Zod d'entrée réservation**

Create `lib/booking/schema.ts`:
```ts
import { z } from "zod";

export const reservationInputSchema = z
  .object({
    resourceId: z.string().min(1),
    unit: z.enum(["HOUR", "HALF_DAY", "DAY", "MONTH"]),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    customerName: z.string().min(2, "Nom requis"),
    customerEmail: z.string().email("Email invalide"),
    customerPhone: z.string().optional().or(z.literal("")),
    company: z.string().optional().or(z.literal("")),
    message: z.string().optional().or(z.literal("")),
  })
  .refine((d) => d.endAt > d.startAt, {
    message: "La fin doit être après le début.",
    path: ["endAt"],
  })
  .refine((d) => d.startAt.getTime() > Date.now() - 60_000, {
    message: "Le créneau doit être dans le futur.",
    path: ["startAt"],
  });

export type ReservationInput = z.infer<typeof reservationInputSchema>;
```

- [ ] **Step 3: Test du schéma**

Create `lib/booking/__tests__/schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { reservationInputSchema } from "@/lib/booking/schema";

const future = new Date(Date.now() + 86_400_000);
const futureEnd = new Date(Date.now() + 86_400_000 + 3_600_000);

describe("reservationInputSchema", () => {
  it("accepts valid input", () => {
    const r = reservationInputSchema.safeParse({
      resourceId: "abc", unit: "HOUR", startAt: future, endAt: futureEnd,
      customerName: "Jean Dupont", customerEmail: "jean@x.fr",
    });
    expect(r.success).toBe(true);
  });
  it("rejects end before start", () => {
    const r = reservationInputSchema.safeParse({
      resourceId: "abc", unit: "HOUR", startAt: futureEnd, endAt: future,
      customerName: "Jean Dupont", customerEmail: "jean@x.fr",
    });
    expect(r.success).toBe(false);
  });
  it("rejects invalid email", () => {
    const r = reservationInputSchema.safeParse({
      resourceId: "abc", unit: "HOUR", startAt: future, endAt: futureEnd,
      customerName: "Jean Dupont", customerEmail: "pas-un-email",
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 4: Lancer les tests**

Run: `npm test -- schema`
Expected: tous PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/booking/errors.ts lib/booking/schema.ts lib/booking/__tests__/schema.test.ts
git commit -m "feat: reservation input schema and domain errors"
```

---

## Task 5: Création de réservation transactionnelle (anti-double-résa)

**Files:**
- Create: `lib/booking/create-reservation.ts`

**Interfaces:**
- Consumes: `prisma`, `computeTotalCents`, `overlaps`/`isSlotAvailable` (logique inline en SQL), `reservationInputSchema`, `SlotUnavailableError`, `Pricing`.
- Produces:
  - `createReservation(input: ReservationInput): Promise<{ reservation: Reservation; autoConfirmed: boolean }>`
  - Garantit l'atomicité capacity-check + insert via `prisma.$transaction`.
  - Le statut initial est `CONFIRMED` si `!requiresValidation`, sinon `PENDING`. (Le workflow d'automatisation complet — emails, PDF, calendar — est branché en Phase 3 ; ici on ne fait que poser le statut.)

- [ ] **Step 1: Implémenter la création transactionnelle**

Create `lib/booking/create-reservation.ts`:
```ts
import type { Reservation } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeTotalCents } from "@/lib/booking/pricing";
import { SlotUnavailableError } from "@/lib/booking/errors";
import type { ReservationInput } from "@/lib/booking/schema";

export async function createReservation(
  input: ReservationInput
): Promise<{ reservation: Reservation; autoConfirmed: boolean }> {
  const resource = await prisma.resource.findUnique({
    where: { id: input.resourceId },
    include: { pricings: true },
  });
  if (!resource || !resource.active) {
    throw new Error("Espace introuvable ou indisponible.");
  }

  const pricing = resource.pricings.find((p) => p.unit === input.unit);
  if (!pricing) throw new Error("Cette unité de réservation n'est pas tarifée.");

  const totalCents = computeTotalCents({
    unit: input.unit,
    priceCents: pricing.priceCents,
    startAt: input.startAt,
    endAt: input.endAt,
  });

  const autoConfirmed = !resource.requiresValidation;
  const initialStatus = autoConfirmed ? "CONFIRMED" : "PENDING";

  const reservation = await prisma.$transaction(async (tx) => {
    // Fermeture chevauchante ?
    const closed = await tx.closedPeriod.count({
      where: { startAt: { lt: input.endAt }, endAt: { gt: input.startAt } },
    });
    if (closed > 0) throw new SlotUnavailableError("Le lieu est fermé sur ce créneau.");

    // Capacity : compter les résa actives chevauchantes
    const activeCount = await tx.reservation.count({
      where: {
        resourceId: resource.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { lt: input.endAt },
        endAt: { gt: input.startAt },
      },
    });
    if (activeCount >= resource.capacity) {
      throw new SlotUnavailableError();
    }

    return tx.reservation.create({
      data: {
        resourceId: resource.id,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone || null,
        company: input.company || null,
        message: input.message || null,
        startAt: input.startAt,
        endAt: input.endAt,
        unit: input.unit,
        totalCents,
        status: initialStatus,
      },
    });
  });

  return { reservation, autoConfirmed };
}
```
Note Phase 3 : un hook `// TODO Phase 3: if (autoConfirmed) await confirmReservation(reservation.id)` sera ajouté dans la Server Action publique, pas ici, pour garder `createReservation` pur côté DB.

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run build`
Expected: build réussi (les pages publiques arrivent ensuite ; ce module compile seul).

- [ ] **Step 3: Test d'intégration anti-double-résa (capacity 1)**

Create `lib/booking/__tests__/create-reservation.int.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createReservation } from "@/lib/booking/create-reservation";
import { SlotUnavailableError } from "@/lib/booking/errors";

let resourceId: string;
const start = new Date(Date.now() + 7 * 86_400_000);
const end = new Date(start.getTime() + 4 * 3_600_000);

describe("createReservation anti-double-booking", () => {
  beforeAll(async () => {
    const r = await prisma.resource.create({
      data: {
        slug: `test-cap1-${Date.now()}`,
        name: "Test Cap1",
        type: "MEETING_ROOM",
        capacity: 1,
        requiresValidation: true,
        pricings: { create: [{ unit: "HALF_DAY", priceCents: 1000 }] },
      },
    });
    resourceId = r.id;
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { resourceId } });
    await prisma.pricing.deleteMany({ where: { resourceId } });
    await prisma.resource.delete({ where: { id: resourceId } });
    await prisma.$disconnect();
  });

  it("allows the first booking then blocks the overlapping one", async () => {
    const base = {
      resourceId, unit: "HALF_DAY" as const, startAt: start, endAt: end,
      customerName: "Client A", customerEmail: "a@x.fr",
    };
    const first = await createReservation(base);
    expect(first.reservation.status).toBe("PENDING");

    await expect(
      createReservation({ ...base, customerName: "Client B", customerEmail: "b@x.fr" })
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });
});
```
Note : ce test touche la vraie DB NeonDB (intégration). Il se nettoie après lui. Si l'environnement CI n'a pas accès à la DB, marquer ce fichier `.int.test.ts` et l'exclure du run unitaire par défaut (voir Step 5).

- [ ] **Step 4: Lancer le test d'intégration**

Run: `npm test -- create-reservation`
Expected: PASS — la 1ʳᵉ résa est créée en PENDING, la 2ᵈᵉ chevauchante est rejetée par `SlotUnavailableError`.

- [ ] **Step 5: Commit**

```bash
git add lib/booking/create-reservation.ts lib/booking/__tests__/create-reservation.int.test.ts
git commit -m "feat: transactional reservation creation with anti-double-booking"
```

---

## Task 6: Layout public + accueil (liste des espaces)

**Files:**
- Create: `app/(public)/layout.tsx`, `app/(public)/page.tsx`, `components/public/resource-card.tsx`
- Modify: supprimer/remplacer l'ancien `app/page.tsx` racine (déplacé sous `(public)`)

**Interfaces:**
- Consumes: `prisma`, `theme`, `formatEuros`.
- Produces: accueil `/` listant les espaces actifs triés par `sortOrder`, en cartes par type.

- [ ] **Step 1: Supprimer la page racine par défaut**

L'accueil vit désormais dans le route group `(public)`. Supprimer `app/page.tsx` s'il existe encore (la racine `/` sera servie par `app/(public)/page.tsx`).
```bash
rm -f app/page.tsx
```

- [ ] **Step 2: Layout public (embeddable + CSP)**

Create `app/(public)/layout.tsx`:
```tsx
import { theme } from "@/lib/theme";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-muted">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="font-display text-xl font-semibold">{theme.business.name}</span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}
```
Note : l'en-tête CSP `frame-ancestors` est ajouté dans `next.config.ts` (Step 5), pas dans le layout.

- [ ] **Step 3: Carte d'espace**

Create `components/public/resource-card.tsx`:
```tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEuros } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  COWORKING: "Coworking",
  MEETING_ROOM: "Salle de réunion",
  EVENT_SPACE: "Espace événementiel",
  OFFICE: "Bureau privatif",
};

type ResourceCardProps = {
  slug: string;
  name: string;
  type: string;
  description: string | null;
  requiresValidation: boolean;
  fromPriceCents: number | null;
};

export function ResourceCard(p: ResourceCardProps) {
  return (
    <Link href={`/reserver/${p.slug}`} className="block transition-transform hover:-translate-y-1">
      <Card className="h-full overflow-hidden rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">{TYPE_LABELS[p.type] ?? p.type}</Badge>
            {p.requiresValidation ? (
              <Badge variant="outline">Sur demande</Badge>
            ) : (
              <Badge className="bg-secondary text-white">Réservation immédiate</Badge>
            )}
          </div>
          <CardTitle className="font-display text-xl">{p.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="line-clamp-3 text-sm text-foreground/70">{p.description}</p>
          {p.fromPriceCents != null && (
            <p className="text-sm font-medium">
              À partir de {formatEuros(p.fromPriceCents)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 4: Page d'accueil**

Create `app/(public)/page.tsx`:
```tsx
import { prisma } from "@/lib/db";
import { theme } from "@/lib/theme";
import { ResourceCard } from "@/components/public/resource-card";

export default async function HomePage() {
  const resources = await prisma.resource.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { pricings: { orderBy: { priceCents: "asc" }, take: 1 } },
  });

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="font-display text-4xl">{theme.business.name}</h1>
        <p className="max-w-2xl text-lg text-foreground/70">{theme.business.tagline}</p>
      </section>

      {resources.length === 0 ? (
        <p className="text-foreground/60">Aucun espace disponible pour le moment.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <ResourceCard
              key={r.id}
              slug={r.slug}
              name={r.name}
              type={r.type}
              description={r.description}
              requiresValidation={r.requiresValidation}
              fromPriceCents={r.pricings[0]?.priceCents ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: En-tête CSP frame-ancestors (embeddabilité)**

Modify `next.config.ts` pour ajouter l'en-tête configurable :
```ts
import type { NextConfig } from "next";

const frameAncestors = process.env.ALLOWED_FRAME_ANCESTORS?.trim();

const nextConfig: NextConfig = {
  async headers() {
    if (!frameAncestors) return []; // démo : pas de restriction
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${frameAncestors};`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 6: Test manuel**

Run: `npm run dev`, ouvrir `http://localhost:3000`.
Expected: les 5 espaces du seed s'affichent en cartes, triés (Grande Salle, Coworking, Salle de réunion, Bureau 1, Bureau 2). Coworking affiche « Réservation immédiate », les autres « Sur demande ». Prix « À partir de » visible.

- [ ] **Step 7: Commit**

```bash
git add "app/(public)" components/public next.config.ts
git rm --cached app/page.tsx 2>/dev/null || true
git commit -m "feat: public home page listing bookable spaces"
```

---

## Task 7: Page espace + sélecteur de créneau + formulaire

**Files:**
- Create: `app/(public)/reserver/[slug]/page.tsx`, `components/public/booking-form.tsx`, `app/(public)/actions.ts`
- Create: `lib/booking/availability-query.ts` (helper de comptage dispo pour l'affichage)

**Interfaces:**
- Consumes: `prisma`, `createReservation`, `reservationInputSchema`, `slotForUnit`, `computeTotalCents`, `formatEuros`, `SlotUnavailableError`.
- Produces:
  - Server Action `createReservationAction(prev, formData): Promise<{ error?: string; ok?: boolean; reservationId?: string; autoConfirmed?: boolean }>`.
  - Page `/reserver/[slug]` avec choix de date/unité + formulaire client.

- [ ] **Step 1: Server Action publique de réservation**

Create `app/(public)/actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { reservationInputSchema } from "@/lib/booking/schema";
import { createReservation } from "@/lib/booking/create-reservation";
import { SlotUnavailableError } from "@/lib/booking/errors";

export type BookingState = { error?: string } | undefined;

export async function createReservationAction(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const parsed = reservationInputSchema.safeParse({
    resourceId: formData.get("resourceId"),
    unit: formData.get("unit"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
    company: formData.get("company"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  let reservationId: string;
  let autoConfirmed: boolean;
  try {
    const res = await createReservation(parsed.data);
    reservationId = res.reservation.id;
    autoConfirmed = res.autoConfirmed;
    // TODO Phase 3: if (autoConfirmed) await confirmReservation(reservationId);
    //               else await sendRequestReceivedEmail(reservationId) + notifyAdmin();
  } catch (e) {
    if (e instanceof SlotUnavailableError) return { error: e.message };
    return { error: "Une erreur est survenue. Réessayez." };
  }

  redirect(`/reserver/confirmation?id=${reservationId}&auto=${autoConfirmed ? "1" : "0"}`);
}
```
Note : la confirmation est une page partagée `/reserver/confirmation` (pas sous `[slug]`) pour simplifier le redirect. Ajuster le chemin de la page en Task 8 en conséquence.

- [ ] **Step 2: Helper d'affichage de disponibilité**

Create `lib/booking/availability-query.ts`:
```ts
import { prisma } from "@/lib/db";

/**
 * Renvoie le nombre de places restantes pour une ressource sur un créneau.
 * Utilisé pour l'affichage public (indicatif ; la garantie reste la transaction).
 */
export async function remainingCapacity(
  resourceId: string,
  capacity: number,
  startAt: Date,
  endAt: Date
): Promise<number> {
  const closed = await prisma.closedPeriod.count({
    where: { startAt: { lt: endAt }, endAt: { gt: startAt } },
  });
  if (closed > 0) return 0;
  const active = await prisma.reservation.count({
    where: {
      resourceId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });
  return Math.max(0, capacity - active);
}
```

- [ ] **Step 3: Formulaire de réservation (client)**

Create `components/public/booking-form.tsx`:
```tsx
"use client";

import { useActionState, useMemo, useState } from "react";
import { createReservationAction, type BookingState } from "@/app/(public)/actions";
import { slotForUnit } from "@/lib/booking/slots";
import { computeTotalCents } from "@/lib/booking/pricing";
import { formatEuros } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PricingOpt = { unit: string; priceCents: number; label: string | null };

export function BookingForm({
  resourceId,
  pricings,
}: {
  resourceId: string;
  pricings: PricingOpt[];
}) {
  const [state, action, pending] = useActionState<BookingState, FormData>(
    createReservationAction,
    undefined
  );
  const [unit, setUnit] = useState(pricings[0]?.unit ?? "DAY");
  const [date, setDate] = useState("");
  const [half, setHalf] = useState<"AM" | "PM">("AM");
  const [hour, setHour] = useState(9);

  const selectedPrice = pricings.find((p) => p.unit === unit)?.priceCents ?? 0;

  const slot = useMemo(() => {
    if (!date) return null;
    return slotForUnit(unit as never, new Date(date + "T00:00"), { half, hour });
  }, [date, unit, half, hour]);

  const total = slot
    ? computeTotalCents({ unit: unit as never, priceCents: selectedPrice, startAt: slot.startAt, endAt: slot.endAt })
    : 0;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="resourceId" value={resourceId} />
      <input type="hidden" name="unit" value={unit} />
      <input type="hidden" name="startAt" value={slot?.startAt.toISOString() ?? ""} />
      <input type="hidden" name="endAt" value={slot?.endAt.toISOString() ?? ""} />

      <div className="space-y-2">
        <Label>Formule</Label>
        <div className="flex flex-wrap gap-2">
          {pricings.map((p) => (
            <button
              key={p.unit}
              type="button"
              onClick={() => setUnit(p.unit)}
              className={`rounded-lg border px-3 py-2 text-sm ${unit === p.unit ? "border-primary bg-primary/10" : "border-muted"}`}
            >
              {p.label ?? p.unit} · {formatEuros(p.priceCents)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>

      {unit === "HALF_DAY" && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setHalf("AM")} className={`rounded-lg border px-3 py-2 text-sm ${half === "AM" ? "border-primary bg-primary/10" : "border-muted"}`}>Matin (9h–13h)</button>
          <button type="button" onClick={() => setHalf("PM")} className={`rounded-lg border px-3 py-2 text-sm ${half === "PM" ? "border-primary bg-primary/10" : "border-muted"}`}>Après-midi (14h–18h)</button>
        </div>
      )}

      {unit === "HOUR" && (
        <div className="space-y-2">
          <Label htmlFor="hour">Heure de début</Label>
          <select id="hour" value={hour} onChange={(e) => setHour(Number(e.target.value))} className="w-full rounded-lg border border-muted px-3 py-2">
            {Array.from({ length: 9 }, (_, i) => i + 9).map((h) => (
              <option key={h} value={h}>{h}h00 – {h + 1}h00</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerName">Nom complet</Label>
          <Input id="customerName" name="customerName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerEmail">Email</Label>
          <Input id="customerEmail" name="customerEmail" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Téléphone</Label>
          <Input id="customerPhone" name="customerPhone" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Société (optionnel)</Label>
          <Input id="company" name="company" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message (optionnel)</Label>
        <Textarea id="message" name="message" rows={3} />
      </div>

      {slot && (
        <div className="rounded-lg bg-muted p-4 text-sm">
          <p>Total estimé : <span className="font-semibold">{formatEuros(total)}</span></p>
        </div>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={pending || !slot}>
        {pending ? "Envoi…" : "Envoyer ma demande"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Page espace**

Create `app/(public)/reserver/[slug]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { BookingForm } from "@/components/public/booking-form";
import { formatEuros } from "@/lib/utils";

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resource = await prisma.resource.findUnique({
    where: { slug },
    include: { pricings: { orderBy: { sortOrder: "asc" } } },
  });
  if (!resource || !resource.active) notFound();

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="aspect-video w-full rounded-lg bg-muted" />
        <h1 className="font-display text-3xl">{resource.name}</h1>
        {resource.requiresValidation ? (
          <Badge variant="outline">Réservation sur demande</Badge>
        ) : (
          <Badge className="bg-secondary text-white">Réservation immédiate</Badge>
        )}
        <p className="text-foreground/70">{resource.description}</p>
        <div className="space-y-1 text-sm">
          <p className="font-medium">Capacité : {resource.capacity} place(s)</p>
          <p className="font-medium">Tarifs :</p>
          <ul className="list-inside list-disc text-foreground/70">
            {resource.pricings.map((p) => (
              <li key={p.id}>{p.label ?? p.unit} — {formatEuros(p.priceCents)}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-muted bg-white p-6">
        <h2 className="mb-4 font-display text-xl">Réserver</h2>
        <BookingForm
          resourceId={resource.id}
          pricings={resource.pricings.map((p) => ({ unit: p.unit, priceCents: p.priceCents, label: p.label }))}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Test manuel (sans soumettre)**

Run: `npm run dev`, ouvrir `/reserver/espace-coworking`.
Expected: page affichée, sélection de formule + date met à jour le total estimé. (Soumission testée en Task 8 une fois la confirmation créée.)

- [ ] **Step 6: Commit**

```bash
git add "app/(public)/reserver" "app/(public)/actions.ts" components/public/booking-form.tsx lib/booking/availability-query.ts
git commit -m "feat: resource page with slot picker and booking form"
```

---

## Task 8: Page de confirmation

**Files:**
- Create: `app/(public)/reserver/confirmation/page.tsx`

**Interfaces:**
- Consumes: `prisma`, `formatEuros`, `formatDateRange`.
- Produces: page `/reserver/confirmation?id=...&auto=1|0` affichant le bon message selon le statut.

- [ ] **Step 1: Page de confirmation**

Create `app/(public)/reserver/confirmation/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatEuros, formatDateRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; auto?: string }>;
}) {
  const { id, auto } = await searchParams;
  if (!id) notFound();
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { resource: true },
  });
  if (!reservation) notFound();

  const autoConfirmed = auto === "1";

  return (
    <div className="mx-auto max-w-lg">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            {autoConfirmed ? "Réservation confirmée ✅" : "Demande bien reçue ✨"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            {autoConfirmed
              ? "Votre réservation est confirmée. Un email de confirmation vous a été envoyé."
              : "Votre demande a été transmise au gérant. Vous recevrez un email dès qu'elle sera validée."}
          </p>
          <div className="rounded-lg bg-muted p-4">
            <p className="font-medium">{reservation.resource.name}</p>
            <p className="text-foreground/70">{formatDateRange(reservation.startAt, reservation.endAt)}</p>
            <p className="text-foreground/70">Total : {formatEuros(reservation.totalCents)}</p>
          </div>
          <a href="/" className="inline-block text-primary underline">← Retour à l'accueil</a>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Test manuel du flux complet coworking (auto-confirmé)**

Run: `npm run dev`. Sur `/reserver/espace-coworking`, remplir le formulaire avec une date future, soumettre.
Expected: redirection vers `/reserver/confirmation?...&auto=1`, message « Réservation confirmée ✅ ». Vérifier en base (Prisma Studio) que la résa est `CONFIRMED`.

- [ ] **Step 3: Test manuel du flux grande salle (sur demande)**

Sur `/reserver/grande-salle`, réserver une demi-journée future.
Expected: redirection avec `auto=0`, message « Demande bien reçue ✨ ». En base, statut `PENDING`.

- [ ] **Step 4: Test manuel anti-double-résa (capacity 1)**

Réserver la grande salle sur le MÊME créneau une 2ᵈᵉ fois.
Expected: message d'erreur « Ce créneau n'est plus disponible. » affiché dans le formulaire.

- [ ] **Step 5: Commit**

```bash
git add "app/(public)/reserver/confirmation"
git commit -m "feat: reservation confirmation page"
```

---

## Task 9: Admin — liste des réservations + filtres + valider/refuser

**Files:**
- Create: `app/admin/reservations/page.tsx`, `app/admin/reservations/[id]/page.tsx`, `components/admin/status-badge.tsx`, `components/admin/reservation-actions.tsx`
- Modify: `app/admin/actions.ts` (ajouter validate/reject)

**Interfaces:**
- Consumes: `prisma`, `createReservation`'s logic (re-check capacity inline), `SlotUnavailableError`, `formatEuros`, `formatDateRange`.
- Produces:
  - `validateReservationAction(id: string): Promise<{ error?: string }>` — re-vérifie la dispo puis passe `CONFIRMED`. (Workflow emails/PDF/calendar branché en Phase 3.)
  - `rejectReservationAction(id: string): Promise<void>` — passe `REJECTED`.
  - Liste filtrable + page détail.

- [ ] **Step 1: Badge de statut**

Create `components/admin/status-badge.tsx`:
```tsx
import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: "En attente", className: "bg-amber-500 text-white" },
  CONFIRMED: { label: "Confirmée", className: "bg-secondary text-white" },
  REJECTED: { label: "Refusée", className: "bg-red-500 text-white" },
  CANCELLED: { label: "Annulée", className: "bg-gray-400 text-white" },
  COMPLETED: { label: "Passée", className: "bg-foreground/70 text-white" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, className: "" };
  return <Badge className={s.className}>{s.label}</Badge>;
}
```

- [ ] **Step 2: Server Actions validate/reject**

Add to `app/admin/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { SlotUnavailableError } from "@/lib/booking/errors";

export async function validateReservationAction(id: string): Promise<{ error?: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({ where: { id }, include: { resource: true } });
      if (!r) throw new Error("Réservation introuvable.");
      if (r.status !== "PENDING") return;

      const activeCount = await tx.reservation.count({
        where: {
          resourceId: r.resourceId,
          id: { not: r.id },
          status: { in: ["PENDING", "CONFIRMED"] },
          startAt: { lt: r.endAt },
          endAt: { gt: r.startAt },
        },
      });
      if (activeCount >= r.resource.capacity) {
        throw new SlotUnavailableError("Le créneau s'est rempli entre-temps.");
      }
      await tx.reservation.update({ where: { id }, data: { status: "CONFIRMED" } });
    });
    // TODO Phase 3: await confirmReservation(id) — emails + PDF + calendar
    revalidatePath("/admin/reservations");
    return {};
  } catch (e) {
    if (e instanceof SlotUnavailableError) return { error: e.message };
    return { error: "Validation impossible." };
  }
}

export async function rejectReservationAction(id: string): Promise<void> {
  await prisma.reservation.update({ where: { id }, data: { status: "REJECTED" } });
  // TODO Phase 3: await sendRejectionEmail(id)
  revalidatePath("/admin/reservations");
}
```
Note : ne pas dupliquer le `logoutAction` existant — ajouter ces fonctions au même fichier `app/admin/actions.ts` (qui contient déjà `logoutAction` de la Phase 1).

- [ ] **Step 3: Boutons d'action (client)**

Create `components/admin/reservation-actions.tsx`:
```tsx
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { validateReservationAction, rejectReservationAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function ReservationActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await validateReservationAction(id);
            if (res.error) toast.error(res.error);
            else toast.success("Réservation validée.");
          })
        }
      >
        Valider
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => start(async () => { await rejectReservationAction(id); toast("Réservation refusée."); })}
      >
        Refuser
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Liste des réservations avec filtres**

Create `app/admin/reservations/page.tsx`:
```tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { StatusBadge } from "@/components/admin/status-badge";
import { ReservationActions } from "@/components/admin/reservation-actions";
import { formatEuros, formatDateRange } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; resourceId?: string }>;
}) {
  const { status, resourceId } = await searchParams;

  const where: Prisma.ReservationWhereInput = {};
  if (status) where.status = status as never;
  if (resourceId) where.resourceId = resourceId;

  const [reservations, resources] = await Promise.all([
    prisma.reservation.findMany({ where, orderBy: { startAt: "desc" }, include: { resource: true } }),
    prisma.resource.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const statuses = ["", "PENDING", "CONFIRMED", "REJECTED", "COMPLETED", "CANCELLED"];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Réservations</h1>

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Link
            key={s || "all"}
            href={s ? `/admin/reservations?status=${s}` : "/admin/reservations"}
            className={`rounded-full border px-3 py-1 text-sm ${status === s || (!status && !s) ? "border-primary bg-primary/10" : "border-muted"}`}
          >
            {s ? <StatusBadge status={s} /> : "Toutes"}
          </Link>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Espace</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Créneau</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-foreground/50">Aucune réservation.</TableCell></TableRow>
          )}
          {reservations.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.resource.name}</TableCell>
              <TableCell>
                <Link href={`/admin/reservations/${r.id}`} className="underline">{r.customerName}</Link>
                <div className="text-xs text-foreground/50">{r.customerEmail}</div>
              </TableCell>
              <TableCell className="text-sm">{formatDateRange(r.startAt, r.endAt)}</TableCell>
              <TableCell>{formatEuros(r.totalCents)}</TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell>{r.status === "PENDING" && <ReservationActions id={r.id} />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 5: Page détail réservation**

Create `app/admin/reservations/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/admin/status-badge";
import { ReservationActions } from "@/components/admin/reservation-actions";
import { formatEuros, formatDateRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReservationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await prisma.reservation.findUnique({ where: { id }, include: { resource: true } });
  if (!r) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">{r.resource.name}</h1>
        <StatusBadge status={r.status} />
      </div>
      <Card className="rounded-lg">
        <CardHeader><CardTitle className="text-lg">Détails</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Client :</strong> {r.customerName} — {r.customerEmail}</p>
          {r.customerPhone && <p><strong>Téléphone :</strong> {r.customerPhone}</p>}
          {r.company && <p><strong>Société :</strong> {r.company}</p>}
          <p><strong>Créneau :</strong> {formatDateRange(r.startAt, r.endAt)}</p>
          <p><strong>Total :</strong> {formatEuros(r.totalCents)}</p>
          {r.message && <p><strong>Message :</strong> {r.message}</p>}
        </CardContent>
      </Card>
      {r.status === "PENDING" && <ReservationActions id={r.id} />}
    </div>
  );
}
```

- [ ] **Step 6: Test manuel**

Run: `npm run dev`, se connecter, aller sur `/admin/reservations`. Filtrer sur « En attente » (3 du seed). Valider une demande → toast « Réservation validée », statut passe à Confirmée. Refuser une autre → Refusée. Ouvrir une fiche détail.

- [ ] **Step 7: Commit**

```bash
git add app/admin/reservations app/admin/actions.ts components/admin/status-badge.tsx components/admin/reservation-actions.tsx
git commit -m "feat: admin reservations list, detail, validate/reject"
```

---

## Task 10: Admin — CRUD espaces + grille tarifaire

**Files:**
- Create: `app/admin/espaces/page.tsx`, `app/admin/espaces/[id]/page.tsx`, `app/admin/espaces/new/page.tsx`, `app/admin/espaces/resource-form.tsx`, `lib/booking/admin-schema.ts`
- Modify: `app/admin/actions.ts` (ajouter CRUD resource + pricing)

**Interfaces:**
- Consumes: `prisma`, Zod.
- Produces:
  - `resourceSchema` (Zod) → `{ name, slug, type, description?, capacity, requiresValidation, active, sortOrder }`.
  - `pricingSchema` (Zod) → `{ resourceId, unit, priceCents, label? }`.
  - `upsertResourceAction`, `deleteResourceAction`, `upsertPricingAction`, `deletePricingAction`.

- [ ] **Step 1: Schémas admin**

Create `lib/booking/admin-schema.ts`:
```ts
import { z } from "zod";

export const resourceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug : minuscules, chiffres, tirets"),
  type: z.enum(["COWORKING", "MEETING_ROOM", "EVENT_SPACE", "OFFICE"]),
  description: z.string().optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1),
  requiresValidation: z.coerce.boolean(),
  active: z.coerce.boolean(),
  sortOrder: z.coerce.number().int().default(0),
});

export const pricingSchema = z.object({
  id: z.string().optional(),
  resourceId: z.string().min(1),
  unit: z.enum(["HOUR", "HALF_DAY", "DAY", "MONTH"]),
  priceCents: z.coerce.number().int().min(0),
  label: z.string().optional().or(z.literal("")),
});

export type ResourceInput = z.infer<typeof resourceSchema>;
export type PricingInput = z.infer<typeof pricingSchema>;
```

- [ ] **Step 2: Server Actions CRUD**

Add to `app/admin/actions.ts`:
```ts
import { resourceSchema, pricingSchema } from "@/lib/booking/admin-schema";

export async function upsertResourceAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = resourceSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug"),
    type: formData.get("type"),
    description: formData.get("description"),
    capacity: formData.get("capacity"),
    requiresValidation: formData.get("requiresValidation") === "on",
    active: formData.get("active") === "on",
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { id, ...data } = parsed.data;
  try {
    if (id) await prisma.resource.update({ where: { id }, data: { ...data, description: data.description || null } });
    else await prisma.resource.create({ data: { ...data, description: data.description || null } });
  } catch {
    return { error: "Slug déjà utilisé ou erreur d'enregistrement." };
  }
  revalidatePath("/admin/espaces");
  redirect("/admin/espaces");
}

export async function deleteResourceAction(id: string): Promise<void> {
  await prisma.resource.update({ where: { id }, data: { active: false } });
  revalidatePath("/admin/espaces");
}

export async function upsertPricingAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = pricingSchema.safeParse({
    id: formData.get("id") || undefined,
    resourceId: formData.get("resourceId"),
    unit: formData.get("unit"),
    priceCents: formData.get("priceCents"),
    label: formData.get("label"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { id, ...data } = parsed.data;
  try {
    await prisma.pricing.upsert({
      where: id ? { id } : { resourceId_unit: { resourceId: data.resourceId, unit: data.unit } },
      create: { ...data, label: data.label || null },
      update: { priceCents: data.priceCents, label: data.label || null },
    });
  } catch {
    return { error: "Erreur d'enregistrement du tarif." };
  }
  revalidatePath(`/admin/espaces/${data.resourceId}`);
  return {};
}

export async function deletePricingAction(id: string, resourceId: string): Promise<void> {
  await prisma.pricing.delete({ where: { id } });
  revalidatePath(`/admin/espaces/${resourceId}`);
}
```
Note : ajouter `import { redirect } from "next/navigation";` en tête de `app/admin/actions.ts` si pas déjà présent.

- [ ] **Step 3: Liste des espaces**

Create `app/admin/espaces/page.tsx`:
```tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function EspacesPage() {
  const resources = await prisma.resource.findMany({
    orderBy: { sortOrder: "asc" },
    include: { pricings: true, _count: { select: { reservations: true } } },
  });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Espaces</h1>
        <Button asChild><Link href="/admin/espaces/new">+ Nouvel espace</Link></Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead><TableHead>Type</TableHead><TableHead>Capacité</TableHead>
            <TableHead>Validation</TableHead><TableHead>Tarifs</TableHead><TableHead>Actif</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.map((r) => (
            <TableRow key={r.id}>
              <TableCell><Link href={`/admin/espaces/${r.id}`} className="underline">{r.name}</Link></TableCell>
              <TableCell>{r.type}</TableCell>
              <TableCell>{r.capacity}</TableCell>
              <TableCell>{r.requiresValidation ? "Requise" : "Auto"}</TableCell>
              <TableCell>{r.pricings.length}</TableCell>
              <TableCell>{r.active ? <Badge className="bg-secondary text-white">Oui</Badge> : <Badge variant="outline">Non</Badge>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 4: Formulaire espace (réutilisé new + edit)**

Create `app/admin/espaces/resource-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { upsertResourceAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Resource = {
  id?: string; name?: string; slug?: string; type?: string; description?: string | null;
  capacity?: number; requiresValidation?: boolean; active?: boolean; sortOrder?: number;
};

export function ResourceForm({ resource }: { resource?: Resource }) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => {
        setPending(true);
        const res = await upsertResourceAction(fd);
        setPending(false);
        if (res?.error) toast.error(res.error);
      }}
      className="max-w-lg space-y-4"
    >
      {resource?.id && <input type="hidden" name="id" value={resource.id} />}
      <div className="space-y-2"><Label htmlFor="name">Nom</Label><Input id="name" name="name" defaultValue={resource?.name} required /></div>
      <div className="space-y-2"><Label htmlFor="slug">Slug</Label><Input id="slug" name="slug" defaultValue={resource?.slug} required /></div>
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <select id="type" name="type" defaultValue={resource?.type ?? "COWORKING"} className="w-full rounded-lg border border-muted px-3 py-2">
          <option value="COWORKING">Coworking</option>
          <option value="MEETING_ROOM">Salle de réunion</option>
          <option value="EVENT_SPACE">Espace événementiel</option>
          <option value="OFFICE">Bureau</option>
        </select>
      </div>
      <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" defaultValue={resource?.description ?? ""} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label htmlFor="capacity">Capacité</Label><Input id="capacity" name="capacity" type="number" min={1} defaultValue={resource?.capacity ?? 1} required /></div>
        <div className="space-y-2"><Label htmlFor="sortOrder">Ordre</Label><Input id="sortOrder" name="sortOrder" type="number" defaultValue={resource?.sortOrder ?? 0} /></div>
      </div>
      <label className="flex items-center gap-2"><input type="checkbox" name="requiresValidation" defaultChecked={resource?.requiresValidation ?? false} /> Validation requise</label>
      <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={resource?.active ?? true} /> Actif</label>
      <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>
  );
}
```

- [ ] **Step 5: Pages new + edit (avec gestion des tarifs en édition)**

Create `app/admin/espaces/new/page.tsx`:
```tsx
import { ResourceForm } from "../resource-form";

export default function NewResourcePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Nouvel espace</h1>
      <ResourceForm />
    </div>
  );
}
```

Create `app/admin/espaces/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ResourceForm } from "../resource-form";
import { PricingManager } from "./pricing-manager";

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = await prisma.resource.findUnique({ where: { id }, include: { pricings: { orderBy: { sortOrder: "asc" } } } });
  if (!resource) notFound();
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-display text-3xl">Modifier : {resource.name}</h1>
      <ResourceForm resource={{ ...resource }} />
      <PricingManager
        resourceId={resource.id}
        pricings={resource.pricings.map((p) => ({ id: p.id, unit: p.unit, priceCents: p.priceCents, label: p.label }))}
      />
    </div>
  );
}
```

- [ ] **Step 6: Gestionnaire de tarifs (client)**

Create `app/admin/espaces/[id]/pricing-manager.tsx`:
```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { upsertPricingAction, deletePricingAction } from "@/app/admin/actions";
import { formatEuros } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type P = { id: string; unit: string; priceCents: number; label: string | null };

export function PricingManager({ resourceId, pricings }: { resourceId: string; pricings: P[] }) {
  const [pending, setPending] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl">Grille tarifaire</h2>
      <ul className="space-y-1 text-sm">
        {pricings.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <span>{p.label ?? p.unit} — {formatEuros(p.priceCents)} ({p.unit})</span>
            <Button size="sm" variant="ghost" onClick={async () => { await deletePricingAction(p.id, resourceId); toast("Tarif supprimé."); }}>Supprimer</Button>
          </li>
        ))}
        {pricings.length === 0 && <li className="text-foreground/50">Aucun tarif.</li>}
      </ul>
      <form
        action={async (fd) => { setPending(true); const r = await upsertPricingAction(fd); setPending(false); if (r?.error) toast.error(r.error); else toast.success("Tarif enregistré."); }}
        className="flex flex-wrap items-end gap-2"
      >
        <input type="hidden" name="resourceId" value={resourceId} />
        <div>
          <label className="block text-xs">Unité</label>
          <select name="unit" className="rounded-lg border border-muted px-2 py-2">
            <option value="HOUR">Heure</option><option value="HALF_DAY">Demi-journée</option>
            <option value="DAY">Journée</option><option value="MONTH">Mois</option>
          </select>
        </div>
        <div><label className="block text-xs">Prix (centimes)</label><Input name="priceCents" type="number" min={0} required className="w-32" /></div>
        <div><label className="block text-xs">Libellé</label><Input name="label" className="w-40" /></div>
        <Button type="submit" disabled={pending}>Ajouter / MAJ</Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Test manuel**

Run: `npm run dev`. Sur `/admin/espaces` : créer un nouvel espace, l'éditer, ajouter un tarif, le supprimer, toggle validation/capacité. Vérifier qu'un slug dupliqué affiche une erreur.

- [ ] **Step 8: Commit**

```bash
git add app/admin/espaces lib/booking/admin-schema.ts app/admin/actions.ts
git commit -m "feat: admin CRUD for resources and pricing"
```

---

## Task 11: Admin — périodes de fermeture

**Files:**
- Create: `app/admin/fermetures/page.tsx`, `app/admin/fermetures/closed-form.tsx`
- Modify: `app/admin/actions.ts` (ajouter create/delete closedPeriod)

**Interfaces:**
- Consumes: `prisma`, Zod.
- Produces: `createClosedPeriodAction`, `deleteClosedPeriodAction`.

- [ ] **Step 1: Server Actions**

Add to `app/admin/actions.ts`:
```ts
export async function createClosedPeriodAction(formData: FormData): Promise<{ error?: string }> {
  const startAt = new Date(String(formData.get("startAt")));
  const endAt = new Date(String(formData.get("endAt")));
  const reason = String(formData.get("reason") || "");
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || endAt <= startAt) {
    return { error: "Dates invalides." };
  }
  await prisma.closedPeriod.create({ data: { startAt, endAt, reason: reason || null } });
  revalidatePath("/admin/fermetures");
  return {};
}

export async function deleteClosedPeriodAction(id: string): Promise<void> {
  await prisma.closedPeriod.delete({ where: { id } });
  revalidatePath("/admin/fermetures");
}
```

- [ ] **Step 2: Formulaire (client)**

Create `app/admin/fermetures/closed-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClosedPeriodAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClosedForm() {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => { setPending(true); const r = await createClosedPeriodAction(fd); setPending(false); if (r?.error) toast.error(r.error); else toast.success("Fermeture ajoutée."); }}
      className="flex flex-wrap items-end gap-3"
    >
      <div><Label htmlFor="startAt">Début</Label><Input id="startAt" name="startAt" type="datetime-local" required /></div>
      <div><Label htmlFor="endAt">Fin</Label><Input id="endAt" name="endAt" type="datetime-local" required /></div>
      <div><Label htmlFor="reason">Motif</Label><Input id="reason" name="reason" /></div>
      <Button type="submit" disabled={pending}>Ajouter</Button>
    </form>
  );
}
```

- [ ] **Step 3: Page fermetures**

Create `app/admin/fermetures/page.tsx`:
```tsx
import { prisma } from "@/lib/db";
import { ClosedForm } from "./closed-form";
import { formatDateRange } from "@/lib/utils";
import { DeleteClosedButton } from "./closed-form";

export default async function FermeturesPage() {
  const periods = await prisma.closedPeriod.findMany({ orderBy: { startAt: "asc" } });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Périodes de fermeture</h1>
      <ClosedForm />
      <ul className="space-y-2">
        {periods.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
            <span>{formatDateRange(p.startAt, p.endAt)}{p.reason ? ` — ${p.reason}` : ""}</span>
            <DeleteClosedButton id={p.id} />
          </li>
        ))}
        {periods.length === 0 && <li className="text-foreground/50">Aucune fermeture programmée.</li>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Bouton de suppression (ajout au même fichier closed-form.tsx)**

Add to `app/admin/fermetures/closed-form.tsx`:
```tsx
import { deleteClosedPeriodAction } from "@/app/admin/actions";

export function DeleteClosedButton({ id }: { id: string }) {
  return (
    <button
      onClick={async () => { await deleteClosedPeriodAction(id); toast("Fermeture supprimée."); }}
      className="text-sm text-red-600 underline"
    >
      Supprimer
    </button>
  );
}
```

- [ ] **Step 5: Test manuel (dont impact sur la dispo)**

Run: `npm run dev`. Ajouter une fermeture couvrant demain toute la journée. Côté public, tenter de réserver le coworking demain → message « Le lieu est fermé sur ce créneau. ». Supprimer la fermeture.

- [ ] **Step 6: Commit**

```bash
git add app/admin/fermetures app/admin/actions.ts
git commit -m "feat: admin closed periods management"
```

---

## Self-Review (Phase 2)

**Spec coverage (étapes 4-6 du build order) :**
- ✅ CRUD espaces + grille tarifaire — Task 10
- ✅ Périodes de fermeture — Task 11
- ✅ Flux public liste → page → dispo → formulaire → confirmation — Tasks 6, 7, 8
- ✅ Calcul total — Task 1
- ✅ Règle anti double-résa transactionnelle — Task 5
- ✅ Validation/refus admin — Task 9
- ✅ Disponibilité (capacity + ClosedPeriod) — Tasks 2, 5, 7 (helper)
- ✅ Statut conditionnel selon requiresValidation — Task 5

**Hooks Phase 3 explicitement marqués (`// TODO Phase 3`) :** workflow `confirmReservation` (emails + PDF + calendar) dans `app/(public)/actions.ts` et `validateReservationAction`/`rejectReservationAction`.

**Type consistency :** `BookingUnit`/`ResourceType`/`ReservationStatus` viennent de `@prisma/client`. `createReservation` renvoie `{ reservation, autoConfirmed }` — consommé tel quel dans la Server Action. `computeTotalCents` signature identique entre `pricing.ts`, `create-reservation.ts` et `booking-form.tsx`. `formatEuros`/`formatDateRange` de Phase 1.

**Placeholder scan :** aucun TODO non intentionnel ; les `// TODO Phase 3` sont des hooks documentés. Le test d'intégration `.int.test.ts` touche la vraie DB (noté).

**Note import Server Actions dans composants client :** Next.js autorise l'import de Server Actions (`"use server"`) depuis des composants client. `app/(public)/actions.ts` et `app/admin/actions.ts` portent `"use server"` en tête de fichier.
