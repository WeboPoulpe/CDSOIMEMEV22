# CDSOIMEME Phase 1A — Duplication & Reskin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Duplicate the « MAQUETTE LOgiciel resa » app into a new standalone project `CDSOIMEMEV2` (new git repo, new NeonDB) and re-skin it to the CD soi-même brand, including a new two-portal landing page.

**Architecture:** Plain folder copy of the Next.js 16 app (minus `node_modules`, `.next`, `.git`), pointed at a fresh NeonDB. Brand identity lives in two mirrored files (`lib/theme.ts` + `app/globals.css :root`); we change the palette/business there, update the typed test, and rebuild. The public home page is rewritten as a static marketing landing (4 prestations + two portal buttons) that does **not** depend on the database — so this plan is independent of the data-model changes coming in Plan 1B.

**Tech Stack:** Next.js 16.2.9 (app router), React 19, Tailwind v4 + shadcn, Prisma 7 + NeonDB, NextAuth v5, Vitest.

## Global Constraints

- This is NOT the Next.js you know — read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code; heed deprecation notices. (from AGENTS.md)
- Brand identity MUST be edited in BOTH `lib/theme.ts` and `app/globals.css :root` — they mirror each other (see the RE-SKINNING header comments in each file).
- New project lives in a sibling folder named exactly `CDSOIMEMEV2`, at the same level as « MAQUETTE LOgiciel resa ».
- Create a **new NeonDB database** for CDSOIMEMEV2. Do NOT reuse the resa project's `DATABASE_URL` / `DIRECT_URL` credential.
- Business name string: `CD soi-même`. Tagline: `Un lieu ressource pour prendre rendez-vous avec vous-même, à votre rythme, en toute sécurité.`
- Brand palette (hex, used verbatim in both theme files):
  - `--background` / `colors.background`: `#FBF5F3` (crème rosé)
  - `--foreground` / `colors.foreground`: `#3A2A33` (prune profond)
  - `--primary` / `colors.primary`: `#B14A78` (rose framboise)
  - `--secondary` / `colors.secondary`: `#9C6B8E` (mauve)
  - `--muted` / `colors.muted`: `#F2E6EC` (rose pâle)
  - `--primary-foreground` / `--secondary-foreground`: `#FFFFFF`
- All user-facing copy is in French.
- Commit after every task. Run `npm test` (Vitest) before each commit; build must stay green.

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `CDSOIMEMEV2/` (whole tree) | The duplicated app | Create (copy) |
| `CDSOIMEMEV2/.env` | New DB + secrets for this project | Create |
| `CDSOIMEMEV2/package.json` | Project name | Modify (`name`) |
| `CDSOIMEMEV2/lib/theme.ts` | Canonical brand tokens (TS) | Modify |
| `CDSOIMEMEV2/app/globals.css` | Brand tokens (CSS `:root`) | Modify |
| `CDSOIMEMEV2/lib/__tests__/theme.test.ts` | Asserts brand identity | Modify |
| `CDSOIMEMEV2/app/layout.tsx` | Root metadata (title/description from theme) | No change needed (reads theme) |
| `CDSOIMEMEV2/app/(public)/page.tsx` | New static CD soi-même landing (2 portals) | Replace |
| `CDSOIMEMEV2/app/(public)/layout.tsx` | Public header/footer copy | Modify |
| `CDSOIMEMEV2/app/login/page.tsx` | Login screen heading/subtitle | Modify |
| `CDSOIMEMEV2/app/login/login-form.tsx` | Remove demo default credentials | Modify |

> All paths below are relative to the **`CDSOIMEMEV2`** project root unless stated otherwise.

---

### Task 1: Duplicate the project into `CDSOIMEMEV2`

**Files:**
- Create: the entire `CDSOIMEMEV2/` tree (copy of « MAQUETTE LOgiciel resa », excluding `node_modules`, `.next`, `.git`)
- Create: `CDSOIMEMEV2/.env`
- Modify: `CDSOIMEMEV2/package.json` (the `name` field)

**Interfaces:**
- Consumes: nothing.
- Produces: a runnable Next.js project at `../CDSOIMEMEV2` with its own git repo and its own NeonDB, building green. Later tasks edit files inside it.

- [ ] **Step 1: Copy the project tree (exclude heavy/VCS dirs)**

Run from inside the resa project root (Git Bash):
```bash
rsync -a --exclude node_modules --exclude .next --exclude .git \
  "../MAQUETTE LOgiciel resa/" "../CDSOIMEMEV2/"
```
If `rsync` is unavailable on Windows, use PowerShell instead:
```powershell
robocopy "..\MAQUETTE LOgiciel resa" "..\CDSOIMEMEV2" /E /XD node_modules .next .git
```
Expected: `../CDSOIMEMEV2` now contains `app/`, `lib/`, `prisma/`, `package.json`, etc.

- [ ] **Step 2: Initialise a fresh git repo**

```bash
cd "../CDSOIMEMEV2"
git init
git add -A
git commit -m "chore: import from resa baseline"
```
Expected: a single initial commit; `git log --oneline` shows one entry.

- [ ] **Step 3: Set the project name**

In `CDSOIMEMEV2/package.json`, change:
```json
"name": "maquette-logiciel-resa",
```
to:
```json
"name": "cdsoimeme",
```

- [ ] **Step 4: Create a new NeonDB database and write `.env`**

Create a new database in the Neon console (project « cdsoimeme »). Copy `.env.example` to `.env` and fill it. Create `CDSOIMEMEV2/.env`:
```env
DATABASE_URL=postgresql://<new-neon-pooled-url>
DIRECT_URL=postgresql://<new-neon-direct-url>
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
DEMO_MODE=true
TZ=Europe/Paris
```
(Leave `BREVO_API_KEY` and Google vars empty — simulated in DEMO_MODE.)
Expected: `.env` exists; values are for the NEW database, not resa's.

- [ ] **Step 5: Install dependencies**

```bash
npm install
```
Expected: completes; `postinstall` runs `prisma generate` without error.

- [ ] **Step 6: Apply migrations and seed the new database**

```bash
npx prisma migrate deploy
npm run db:seed
```
Expected: migrations apply to the new DB; seed prints `✅ Seed terminé : 5 espaces, 10 réservations, 1 admin, 1 contrat type.`

- [ ] **Step 7: Verify build and tests are green**

```bash
npm test
npm run build
```
Expected: Vitest passes; `next build` completes with no errors.

- [ ] **Step 8: Smoke-run the app**

```bash
npm run dev
```
Open `http://localhost:3000` (resa landing still shown — reskin comes next) and `http://localhost:3000/login` (login `admin@demo.fr` / `demo1234` → `/admin`). Stop the server.
Expected: both pages load; admin login works against the new DB.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: standalone cdsoimeme project (new db, fresh repo)"
```

---

### Task 2: Re-skin brand tokens (palette + business identity)

**Files:**
- Modify: `lib/theme.ts` (business + colors)
- Modify: `app/globals.css` (the `:root` brand block, lines ~70–84)
- Test: `lib/__tests__/theme.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `theme.business.name === "CD soi-même"` and the CD soi-même palette, consumed by layout, emails, and all components reading brand tokens.

- [ ] **Step 1: Update the test to expect the new identity**

In `lib/__tests__/theme.test.ts`, change the assertion:
```ts
  it("exposes business identity", () => {
    expect(theme.business.name).toBe("CD soi-même");
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/theme.test.ts`
Expected: FAIL — received `"La Grange Lyotaine"`, expected `"CD soi-même"`.

- [ ] **Step 3: Update `lib/theme.ts`**

Replace the `business` and `colors` blocks:
```ts
export const theme = {
  business: {
    name: "CD soi-même",
    logo: "/logo.svg",
    tagline:
      "Un lieu ressource pour prendre rendez-vous avec vous-même, à votre rythme, en toute sécurité.",
  },
  colors: {
    background: "#FBF5F3", // crème rosé
    foreground: "#3A2A33", // prune profond
    primary: "#B14A78",    // rose framboise
    secondary: "#9C6B8E",  // mauve
    muted: "#F2E6EC",      // rose pâle
  },
  fonts: {
    display: "Bricolage Grotesque",
    body: "DM Sans",
  },
  radius: "1rem",
} as const;
```
(Keep `themeToCssVars` and the `Theme` type unchanged.)

- [ ] **Step 4: Update the `:root` brand block in `app/globals.css`**

Replace the brand override lines (the block starting `/* ── Brand theme overrides (La Grange Lyotaine) */`) with:
```css
  /* ── Brand theme overrides (CD soi-même) ─────────────────────────────── */
  --background: #FBF5F3;          /* crème rosé */
  --foreground: #3A2A33;          /* prune profond */
  --primary: #B14A78;             /* rose framboise */
  --primary-foreground: #FFFFFF;  /* texte clair sur primary */
  --secondary: #9C6B8E;           /* mauve */
  --secondary-foreground: #FFFFFF;
  --muted: #F2E6EC;               /* rose pâle */
  --muted-foreground: #7c6470;
  --radius: 1rem;
  /* ── shadcn defaults — card/popover equal --background; keep all three in sync ── */
  --card: #FBF5F3;                /* = --background */
  --card-foreground: #3A2A33;
  --popover: #FBF5F3;             /* = --background */
  --popover-foreground: #3A2A33;
```
(Leave the `--accent`, `--destructive`, `--border`, chart and sidebar vars as they are.)

- [ ] **Step 5: Run the theme test to verify it passes**

Run: `npx vitest run lib/__tests__/theme.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the full suite + build**

Run: `npm test && npm run build`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add lib/theme.ts app/globals.css lib/__tests__/theme.test.ts
git commit -m "feat: re-skin brand tokens to CD soi-même palette"
```

---

### Task 3: Rewrite the public landing page (two portals)

**Files:**
- Replace: `app/(public)/page.tsx`
- Modify: `app/(public)/layout.tsx`

**Interfaces:**
- Consumes: `theme.business` from `lib/theme.ts`.
- Produces: a static landing at `/` with 4 prestation cards and two portal links (`Espace Praticienne`, `Espace Client`) both pointing to `/login`. No database access (so it is independent of Plan 1B's schema changes).

- [ ] **Step 1: Replace `app/(public)/page.tsx` with the static landing**

```tsx
import Link from "next/link";
import { Sparkles, Heart, Leaf, Footprints } from "lucide-react";
import { theme } from "@/lib/theme";

const prestations = [
  {
    icon: Footprints,
    title: "Réflexologie",
    text: "Une approche corporelle douce pour soutenir l'équilibre du corps, libérer les tensions et accompagner les déséquilibres physiques et émotionnels.",
  },
  {
    icon: Heart,
    title: "Massage de libération émotionnelle",
    text: "Un massage profond et enveloppant du ventre suivi d'un bain sonore qui permet au corps de relâcher ce qui a été retenu, parfois depuis longtemps.",
  },
  {
    icon: Leaf,
    title: "Massage bien-être",
    text: "Un massage unique, adapté à l'instant, guidé par l'écoute du corps et de ses besoins.",
  },
  {
    icon: Sparkles,
    title: "Coaching de vie psycho-émotionnel",
    text: "Un accompagnement pour mettre du sens sur ce que vous traversez, comprendre vos fonctionnements et avancer avec plus de conscience et d'alignement.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center">
        <p className="eyebrow mb-4">Réflexologie · Énergétique · Naturopathie</p>
        <h1 className="font-display text-3xl font-bold leading-tight sm:text-5xl">
          Bienvenue dans l'univers de {theme.business.name}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-foreground/70 sm:text-lg">
          {theme.business.tagline}
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-base text-foreground/60">
          Ici, vous choisissez de vous écouter, de vous reconnecter à votre corps, à vos
          émotions et à ce qui fait sens pour vous.
        </p>
      </section>

      {/* Prestations */}
      <section className="grid gap-6 sm:grid-cols-2">
        {prestations.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className="rounded-2xl bg-card p-7 text-center shadow-sm ring-1 ring-muted"
            >
              <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-muted text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
                {p.title}
              </h2>
              <p className="mt-3 text-sm text-foreground/65">{p.text}</p>
            </div>
          );
        })}
      </section>

      {/* Portals */}
      <section className="text-center">
        <h2 className="font-display text-2xl">Chaque accompagnement est unique.</h2>
        <p className="mx-auto mt-2 max-w-xl text-foreground/65">
          Il se construit avec Vous, en respectant Votre histoire, Votre rythme et Vos
          besoins du moment.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-full border border-primary px-7 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Espace Praticienne
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Espace Client
          </Link>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Update the public header/footer copy in `app/(public)/layout.tsx`**

Change the header `Réserver` link to point at the login portal:
```tsx
          <Link
            href="/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Se connecter
          </Link>
```
(Keep the rest of the layout; it already renders `theme.business.name` and `theme.business.tagline`.)

- [ ] **Step 3: Build and smoke-test**

Run: `npm run build`
Expected: build passes (no reference to `prisma`/`ResourceCard` left in `page.tsx`).
Then `npm run dev`, open `/` — verify the 4 cards and both portal buttons render and link to `/login`. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/page.tsx" "app/(public)/layout.tsx"
git commit -m "feat: CD soi-même landing with two portals"
```

---

### Task 4: Reskin the login screen copy

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/login/login-form.tsx`

**Interfaces:**
- Consumes: `theme.business.name`.
- Produces: a login screen titled with the brand and without hard-coded demo credentials (those leak the admin password in the UI).

- [ ] **Step 1: Update the login card copy in `app/login/page.tsx`**

Change the subtitle line:
```tsx
          <p className="text-sm text-foreground/60">Connectez-vous à votre espace</p>
```

- [ ] **Step 2: Remove demo default credentials in `app/login/login-form.tsx`**

Remove the two `defaultValue=...` attributes so the email/password fields start empty:
```tsx
        <Input id="email" name="email" type="email" required />
```
```tsx
        <Input id="password" name="password" type="password" required />
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add app/login/page.tsx app/login/login-form.tsx
git commit -m "feat: brand login screen, drop demo default credentials"
```

---

## Self-Review

- **Spec coverage (Phase 1 §Reskin + landing):** Duplication (Task 1), reskin tokens (Task 2), two-portal landing (Task 3), login copy (Task 4). ✅ Schema/auth/invitation are intentionally deferred to Plans 1B/1C.
- **Placeholder scan:** The only `<...>` placeholders are the NeonDB connection strings and `NEXTAUTH_SECRET` in `.env` — these are per-environment secrets the implementer must supply, not code placeholders. No TODO/TBD in code steps.
- **Type consistency:** `theme` keeps its existing shape (`business`, `colors`, `fonts`, `radius`); `themeToCssVars` and `Theme` untouched, so all consumers stay valid. The landing page drops its `prisma`/`ResourceCard` imports (was the only DB coupling).

## Notes for Plan 1B / 1C

- The seed and schema are still the resa ones after this plan — Plan 1B replaces them (Resource→Prestation, Reservation→RendezVous, drop Contract/Pricing, add CLIENT role + invitation fields) and rewrites the seed for CD soi-même.
- The two portal buttons both link to `/login`; Plan 1B makes the post-login redirect role-based (ADMIN→/admin, CLIENT→/espace).
