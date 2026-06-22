# CDSOIMEME Phase 1B — Data Model & Multi-Role Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second user type (`CLIENT`) with invitation fields, link a séance (Reservation) to a cliente, make post-login redirect role-based, add a `requireClient` guard, and reseed the database with CD soi-même content (prestations, clientes, séances).

**Architecture:** We keep the existing Prisma model names (`Resource`, `Reservation`) — only labels in the UI change to « prestations » / « séances ». Structural changes: extend the `Role` enum with `CLIENT`, make `User.password` nullable (invited-but-not-activated), add invitation + profile fields to `User`, and add an optional `clientId` relation from `Reservation` to `User`. Auth gains role-aware login redirect and a `requireClient()` guard mirroring `requireAdmin()`.

**Tech Stack:** Next.js 16.2.9, Prisma 7 + NeonDB, NextAuth v5 (Credentials, JWT), bcryptjs, Vitest.

## Global Constraints

- This plan runs **inside the `CDSOIMEMEV2` project** produced by Plan 1A. All paths are relative to that root.
- Keep Prisma model names `Resource`/`Reservation` (decision: relabel UI only, no rename).
- This is NOT the Next.js you know — consult `node_modules/next/dist/docs/` before Next-specific code.
- Business name string everywhere: `CD soi-même`. Copy in French.
- Prestations are priced per `HOUR` (a séance = a 1-hour slot), `capacity = 1`, `requiresValidation = true`.
- Migrations via `npx prisma migrate dev --name <name>` (needs `DIRECT_URL`). Commit the generated migration folder.
- Run `npm test` before every commit; build must stay green.

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `prisma/schema.prisma` | `Role` enum + `User` invitation/profile fields + `Reservation.clientId` | Modify |
| `prisma/migrations/<ts>_client_role_and_invites/` | Generated migration | Create |
| `next-auth.d.ts` | (already types `role: string`) | No change |
| `lib/auth.ts` | Nullable-password authorize + `requireAdmin` role check + new `requireClient` | Modify |
| `lib/__tests__/auth-guards.test.ts` | Unit tests for the guards | Create |
| `app/login/actions.ts` | Role-based `redirectTo` | Modify |
| `prisma/seed.ts` | CD soi-même seed (Charline, prestations, clientes, séances) | Replace |
| `components/admin/sidebar.tsx` | Relabel nav (Séances / Prestations / Clientes) | Modify |

---

### Task 1: Schema — CLIENT role, invitation fields, séance↔cliente link

**Files:**
- Modify: `prisma/schema.prisma` (`Role` enum, `User` model, `Reservation` model)
- Create: migration under `prisma/migrations/`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `enum Role { ADMIN CLIENT }`
  - `User { password String?  phone String?  notes String?  inviteToken String? @unique  inviteTokenExpiresAt DateTime?  inviteSentAt DateTime?  passwordSetAt DateTime?  reservations Reservation[] @relation("ClientReservations") }`
  - `Reservation { clientId String?  client User? @relation("ClientReservations", fields: [clientId], references: [id]) }`

- [ ] **Step 1: Edit the `Role` enum and `User` model in `prisma/schema.prisma`**

Replace the `User` model and `Role` enum (currently lines ~145–156) with:
```prisma
model User {
  id                   String        @id @default(cuid())
  email                String        @unique
  password             String?       // null tant que l'invitation n'est pas acceptée
  name                 String?
  role                 Role          @default(CLIENT)
  phone                String?
  notes                String?       // note privée praticienne
  inviteToken          String?       @unique
  inviteTokenExpiresAt DateTime?
  inviteSentAt         DateTime?
  passwordSetAt        DateTime?
  reservations         Reservation[] @relation("ClientReservations")
  createdAt            DateTime      @default(now())
}

enum Role {
  ADMIN
  CLIENT
}
```

- [ ] **Step 2: Add the `clientId` relation to the `Reservation` model**

In the `Reservation` model, add these two lines (next to `resourceId`):
```prisma
  client        User?             @relation("ClientReservations", fields: [clientId], references: [id])
  clientId      String?
```
And add an index near the other `@@index` lines:
```prisma
  @@index([clientId])
```

- [ ] **Step 3: Generate the migration**

Run:
```bash
npx prisma migrate dev --name client_role_and_invites
```
Expected: a new folder `prisma/migrations/<timestamp>_client_role_and_invites/migration.sql` is created and applied; `prisma generate` re-runs. The SQL adds the `CLIENT` enum value, the new nullable `User` columns, and `Reservation.clientId` + FK + index.

- [ ] **Step 4: Verify the client types compile**

Run: `npx tsc --noEmit`
Expected: no errors from the schema change yet (auth.ts still compiles because `user.password` is only read after a null check we add in Task 2 — if tsc flags `bcrypt.compare(password, user.password)` here, that's expected and fixed in Task 2; you may run this check after Task 2 instead).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: CLIENT role, invitation fields, séance-cliente link"
```

---

### Task 2: Auth guards — nullable password, role-aware `requireAdmin`/`requireClient`

**Files:**
- Modify: `lib/auth.ts`
- Test: `lib/__tests__/auth-guards.test.ts`

**Interfaces:**
- Consumes: `auth()` session (`session.user.role`, `session.user.id`).
- Produces:
  - `requireAdmin(): Promise<Session>` — throws `"Unauthorized"` if no session or `role !== "ADMIN"`.
  - `requireClient(): Promise<Session>` — throws `"Unauthorized"` if no session or `role !== "CLIENT"`; returns the session (callers read `session.user.id` to scope data).
  - `authorize` rejects users whose `password` is null (invited, not activated).

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/auth-guards.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the next-auth `auth()` used inside lib/auth.ts
const authMock = vi.fn();
vi.mock("next-auth", () => ({
  default: () => ({ handlers: {}, auth: authMock, signIn: vi.fn(), signOut: vi.fn() }),
}));
vi.mock("next-auth/providers/credentials", () => ({ default: () => ({}) }));

import { requireAdmin, requireClient } from "@/lib/auth";

beforeEach(() => authMock.mockReset());

describe("requireAdmin", () => {
  it("throws when not authenticated", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("Unauthorized");
  });
  it("throws when role is CLIENT", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "CLIENT" } });
    await expect(requireAdmin()).rejects.toThrow("Unauthorized");
  });
  it("returns the session for an ADMIN", async () => {
    const session = { user: { id: "u1", role: "ADMIN" } };
    authMock.mockResolvedValue(session);
    await expect(requireAdmin()).resolves.toBe(session);
  });
});

describe("requireClient", () => {
  it("throws when role is ADMIN", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    await expect(requireClient()).rejects.toThrow("Unauthorized");
  });
  it("returns the session for a CLIENT", async () => {
    const session = { user: { id: "c1", role: "CLIENT" } };
    authMock.mockResolvedValue(session);
    await expect(requireClient()).resolves.toBe(session);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/auth-guards.test.ts`
Expected: FAIL — `requireClient` is not exported / `requireAdmin` does not check role.

- [ ] **Step 3: Update `lib/auth.ts`**

Change the `authorize` password check to handle a null password, and replace `requireAdmin`, adding `requireClient`:
```ts
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null; // invité non activé → pas de mot de passe
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
```
```ts
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

export async function requireClient() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT") throw new Error("Unauthorized");
  return session;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/__tests__/auth-guards.test.ts`
Expected: PASS (all 5 cases).

- [ ] **Step 5: Run full suite + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts lib/__tests__/auth-guards.test.ts
git commit -m "feat: role-aware requireAdmin + requireClient guards"
```

---

### Task 3: Role-based login redirect

**Files:**
- Modify: `app/login/actions.ts`

**Interfaces:**
- Consumes: `prisma.user.findUnique` (to read role), `signIn`.
- Produces: after a successful login, ADMIN lands on `/admin`, CLIENT on `/espace`.

- [ ] **Step 1: Update `app/login/actions.ts`**

Replace the body so the redirect target depends on the user's role:
```ts
"use server";

import { signIn } from "@/lib/auth";
import { loginSchema } from "@/lib/auth-schema";
import { prisma } from "@/lib/db";
import { AuthError } from "next-auth";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Identifiants invalides." };
  }

  // Determine landing page by role (lookup is safe: signIn re-validates the password).
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { role: true },
  });
  const redirectTo = user?.role === "CLIENT" ? "/espace" : "/admin";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Email ou mot de passe incorrect." };
    }
    throw e; // redirect throws — laisser remonter
  }
  return undefined;
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: passes. (`/espace` doesn't exist yet — that's fine, it's a string redirect target built in Plan 1C; nothing imports it.)

- [ ] **Step 3: Commit**

```bash
git add app/login/actions.ts
git commit -m "feat: redirect login by role (ADMIN→/admin, CLIENT→/espace)"
```

---

### Task 4: Reseed the database with CD soi-même content

**Files:**
- Replace: `prisma/seed.ts`

**Interfaces:**
- Consumes: Prisma client (new schema).
- Produces: 1 admin (Charline), CD soi-même `Settings`, 4 prestations (each with one HOUR pricing), 3 clientes (2 activated with password, 1 invited-pending), and ~4 upcoming CONFIRMED séances linked to clientes via `clientId`.

- [ ] **Step 1: Replace `prisma/seed.ts`**

```ts
import { PrismaClient, ResourceType, BookingUnit, ReservationStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seed() {
  // Purge (ordre des FK)
  await prisma.contract.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.pricing.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.contractTemplate.deleteMany();
  await prisma.closedPeriod.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.user.deleteMany();

  // Praticienne (admin)
  await prisma.user.create({
    data: {
      email: "charline@cdsoimeme.fr",
      password: await bcrypt.hash("demo1234", 10),
      name: "Charline",
      role: "ADMIN",
      passwordSetAt: new Date(),
    },
  });

  // Réglages
  await prisma.settings.create({
    data: {
      businessName: "CD soi-même",
      contactEmail: "contact@cdsoimeme.fr",
      contactPhone: "06 00 00 00 00",
      fromEmail: "no-reply@cdsoimeme.fr",
      address: "Sainte-Savine, 10300",
    },
  });

  // Prestations (Resource) — tarif unique à la séance (unité HOUR = 1h)
  const prestationsData = [
    { slug: "reflexologie", name: "Réflexologie", price: 6000,
      description: "Une approche corporelle douce pour soutenir l'équilibre du corps et libérer les tensions." },
    { slug: "liberation-emotionnelle", name: "Massage de libération émotionnelle", price: 8000,
      description: "Un massage profond du ventre suivi d'un bain sonore pour relâcher ce qui a été retenu." },
    { slug: "massage-bien-etre", name: "Massage bien-être", price: 7000,
      description: "Un massage unique, adapté à l'instant, guidé par l'écoute du corps." },
    { slug: "coaching", name: "Coaching de vie psycho-émotionnel", price: 7500,
      description: "Un accompagnement pour mettre du sens sur ce que vous traversez et avancer avec conscience." },
  ];
  const prestations: Record<string, { id: string }> = {};
  let order = 1;
  for (const p of prestationsData) {
    const created = await prisma.resource.create({
      data: {
        slug: p.slug,
        name: p.name,
        type: ResourceType.OFFICE, // valeur d'enum neutre — non affichée
        description: p.description,
        capacity: 1,
        requiresValidation: true,
        sortOrder: order++,
        images: [],
        pricings: { create: [{ unit: BookingUnit.HOUR, priceCents: p.price, label: "La séance", sortOrder: 1 }] },
      },
    });
    prestations[p.slug] = { id: created.id };
  }

  // Clientes
  const marie = await prisma.user.create({
    data: {
      email: "marie@exemple.fr",
      name: "Marie Bounoua",
      role: "CLIENT",
      phone: "06 11 11 11 11",
      password: await bcrypt.hash("demo1234", 10),
      passwordSetAt: new Date(),
    },
  });
  const corene = await prisma.user.create({
    data: {
      email: "corene@exemple.fr",
      name: "Corène Veron",
      role: "CLIENT",
      password: await bcrypt.hash("demo1234", 10),
      passwordSetAt: new Date(),
    },
  });
  // Cliente invitée, pas encore activée (password null, token en attente)
  await prisma.user.create({
    data: {
      email: "laurine@exemple.fr",
      name: "Laurine Petit",
      role: "CLIENT",
      inviteToken: "demo-invite-token-laurine",
      inviteTokenExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      inviteSentAt: new Date(),
    },
  });

  // Séances à venir (Reservation CONFIRMED, rattachées à une cliente)
  const now = new Date();
  const at = (dayOffset: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const seances = [
    { clientId: marie.id, name: marie.name!, email: marie.email, presta: "coaching", start: at(5, 14), price: 7500 },
    { clientId: marie.id, name: marie.name!, email: marie.email, presta: "reflexologie", start: at(12, 10), price: 6000 },
    { clientId: corene.id, name: corene.name!, email: corene.email, presta: "liberation-emotionnelle", start: at(3, 15), price: 8000 },
    { clientId: corene.id, name: corene.name!, email: corene.email, presta: "massage-bien-etre", start: at(-6, 11), price: 7000 },
  ];
  for (const s of seances) {
    const end = new Date(s.start);
    end.setHours(end.getHours() + 1);
    await prisma.reservation.create({
      data: {
        resourceId: prestations[s.presta].id,
        clientId: s.clientId,
        customerName: s.name,
        customerEmail: s.email,
        startAt: s.start,
        endAt: end,
        unit: BookingUnit.HOUR,
        status: ReservationStatus.CONFIRMED,
        totalCents: s.price,
      },
    });
  }

  console.log("✅ Seed CD soi-même : 4 prestations, 3 clientes (1 invitée), 4 séances, 1 praticienne.");
}

// Exécution directe (tsx prisma/seed.ts) — ne pas déclencher à l'import
const isDirectRun = process.argv[1]?.includes("seed");
if (isDirectRun) {
  seed()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
```

- [ ] **Step 2: Run the seed**

```bash
npm run db:seed
```
Expected: prints `✅ Seed CD soi-même : 4 prestations, 3 clientes (1 invitée), 4 séances, 1 praticienne.`

- [ ] **Step 3: Smoke-test admin against new data**

`npm run dev`, log in at `/login` with `charline@cdsoimeme.fr` / `demo1234` → `/admin` shows the 4 prestations as « réservations »/data and upcoming séances. Stop the server.
Expected: dashboard loads with seeded séances.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: CD soi-même seed (prestations, clientes, séances)"
```

---

### Task 5: Relabel the admin navigation

**Files:**
- Modify: `components/admin/sidebar.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: nav labels read « Séances », « Prestations », « Réglages » (hrefs unchanged); the « Modèle de contrat » link is removed from the nav (the page still exists, just unlinked for Phase 1). A « Clientes » link is added in Plan 1C.

- [ ] **Step 1: Update the `links` array in `components/admin/sidebar.tsx`**

```tsx
const links = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/calendrier", label: "Calendrier" },
  { href: "/admin/reservations", label: "Séances" },
  { href: "/admin/espaces", label: "Prestations" },
  { href: "/admin/fermetures", label: "Indisponibilités" },
  { href: "/admin/reglages", label: "Réglages" },
];
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/admin/sidebar.tsx
git commit -m "feat: relabel admin nav for CD soi-même (séances, prestations)"
```

---

## Self-Review

- **Spec coverage (Phase 1 §Modèle de données + §Auth):** CLIENT role + invitation fields + clientId (Task 1); nullable-password authorize + `requireClient`/role-aware `requireAdmin` (Task 2); role-based redirect (Task 3); CD soi-même seed with clientes & séances (Task 4); UI relabel (Task 5). ✅ Invitation *flow* and the *client space* itself are Plan 1C.
- **Placeholder scan:** No TODO/TBD. `demo-invite-token-laurine` is intentional seed data for testing the Plan 1C invitation-acceptance page, not a placeholder.
- **Type consistency:** `requireClient`/`requireAdmin` return `Session`; `Role` enum values `ADMIN`/`CLIENT` are used identically in auth, actions, and seed. `User.password` is nullable and every read (`authorize`) null-checks it. `Reservation.clientId` is optional everywhere it's written.

## Notes for Plan 1C

- A cliente already exists in seed with a pending `inviteToken` (`demo-invite-token-laurine`) — Plan 1C's `/invitation/[token]` page can be tested against it.
- `requireClient()` and `session.user.id` are the basis for scoping `/espace` queries to `clientId === session.user.id`.
- The admin « Clientes » nav link + pages (`/admin/clientes*`) and the invitation email are added in Plan 1C.
