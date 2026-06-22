# Réservation Multi-Espaces — Plan Phase 1 : Fondations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffolder l'app Next.js 15, poser le schéma Prisma sur NeonDB avec seed « La Grange Lyotaine », le système de thème centralisé, l'auth admin NextAuth v5, et le shell du dashboard protégé.

**Architecture:** Next.js 15 App Router avec route groups `(public)` et `admin`. Logique métier isolée dans `lib/`. Thème centralisé dans `lib/theme.ts` injecté en CSS variables. NextAuth v5 credentials + bcrypt. Prisma + PostgreSQL (NeonDB) avec `directUrl` non-pooled pour migrate/seed.

**Tech Stack:** Next.js 15, TypeScript (strict), Tailwind CSS, shadcn/ui, Prisma, PostgreSQL (NeonDB), NextAuth v5 (Auth.js), bcryptjs, Zod.

**Spec de référence:** [docs/superpowers/specs/2026-06-17-resa-multi-espaces-design.md](../specs/2026-06-17-resa-multi-espaces-design.md)

## Global Constraints

- **Next.js 15** App Router, Server Actions activées, TypeScript `strict: true`.
- Montants TOUJOURS en **centimes (Int)**, devise EUR. Jamais de float pour l'argent.
- Toutes les mutations passent par **Server Actions** (pas d'API routes publiques sauf auth + demo reset).
- Entrées validées avec **Zod** avant toute écriture DB.
- Secrets dans `.env` uniquement ; `.env.example` ne contient que des placeholders.
- `DATABASE_URL` = NeonDB pooler (runtime) ; `DIRECT_URL` = non-pooled (migrate/seed).
- Le re-skin doit se faire en éditant uniquement `lib/theme.ts` + le logo. Aucune couleur/police en dur ailleurs.
- Identifiants démo : `admin@demo.fr` / `demo1234`.
- Node 20+. Gestionnaire de paquets : **npm**.

---

## File Structure (Phase 1)

| Fichier | Responsabilité |
|---------|----------------|
| `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs` | Config projet |
| `components.json` | Config shadcn/ui |
| `.env`, `.env.example`, `.gitignore` | Environnement |
| `prisma/schema.prisma` | Modèle de données complet |
| `prisma/seed.ts` | Données démo « La Grange Lyotaine » |
| `lib/db.ts` | Singleton client Prisma |
| `lib/theme.ts` | Config thème centralisée |
| `lib/auth.ts` | Config NextAuth v5 |
| `lib/utils.ts` | `cn()`, formatage montants/dates |
| `app/layout.tsx` | Root layout : fonts, CSS variables thème |
| `app/globals.css` | Tailwind + CSS variables |
| `app/login/page.tsx` | Page connexion admin |
| `app/api/auth/[...nextauth]/route.ts` | Handler NextAuth |
| `middleware.ts` | Protection des routes `/admin` |
| `app/admin/layout.tsx` | Shell dashboard (sidebar + garde session) |
| `app/admin/page.tsx` | Placeholder vue d'ensemble |
| `lib/__tests__/utils.test.ts`, `lib/__tests__/theme.test.ts` | Tests unitaires |

---

## Task 1: Scaffold Next.js 15 + TypeScript + Tailwind

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `.gitignore`

**Interfaces:**
- Produces: un projet Next.js 15 qui démarre avec `npm run dev`.

- [ ] **Step 1: Créer le projet Next.js 15**

Run depuis le dossier projet (le dossier contient déjà `docs/` et `.git/`, donc on scaffolde en place) :
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias "@/*" --no-eslint --use-npm --yes
```
Si `create-next-app` refuse à cause de fichiers existants, scaffolder dans un dossier temporaire puis copier :
```bash
npx create-next-app@latest _tmp_scaffold --typescript --tailwind --app --src-dir=false --import-alias "@/*" --no-eslint --use-npm --yes
cp -r _tmp_scaffold/. .
rm -rf _tmp_scaffold
```

- [ ] **Step 2: Activer le mode strict TypeScript**

Vérifier que `tsconfig.json` contient `"strict": true` (create-next-app le met par défaut). Sinon l'ajouter dans `compilerOptions`.

- [ ] **Step 3: Vérifier le démarrage**

Run: `npm run dev` puis ouvrir `http://localhost:3000`
Expected: la page Next.js par défaut s'affiche sans erreur. Arrêter le serveur (Ctrl+C).

- [ ] **Step 4: Vérifier le build**

Run: `npm run build`
Expected: build réussi, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 with TypeScript and Tailwind"
```

---

## Task 2: Installer les dépendances & configurer shadcn/ui

**Files:**
- Modify: `package.json`
- Create: `components.json`, `lib/utils.ts` (généré par shadcn), `components/ui/*`

**Interfaces:**
- Produces: composants shadcn `button`, `input`, `card`, `table`, `badge`, `dialog`, `select`, `label`, `textarea`, `sonner` (toast) disponibles sous `components/ui/`.

- [ ] **Step 1: Installer les dépendances applicatives**

```bash
npm install @prisma/client next-auth@beta bcryptjs zod react-big-calendar @react-pdf/renderer @getbrevo/brevo googleapis date-fns
npm install -D prisma @types/bcryptjs @types/react-big-calendar tsx vitest @vitejs/plugin-react
```

- [ ] **Step 2: Initialiser shadcn/ui**

```bash
npx shadcn@latest init --yes --base-color stone
```
Quand demandé, accepter les valeurs par défaut (style "new-york", CSS variables = oui).

- [ ] **Step 3: Ajouter les composants UI nécessaires**

```bash
npx shadcn@latest add button input card table badge dialog select label textarea sonner --yes
```

- [ ] **Step 4: Vérifier l'installation**

Run: `npm run build`
Expected: build réussi. `components/ui/button.tsx` et les autres existent.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: install deps and configure shadcn/ui"
```

---

## Task 3: Configurer Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (ajouter scripts test)

**Interfaces:**
- Produces: `npm test` exécute Vitest. Les tests vivent dans `lib/**/__tests__/*.test.ts`.

- [ ] **Step 1: Créer la config Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 2: Ajouter les scripts de test**

Modify `package.json`, dans `"scripts"` ajouter :
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Écrire un test sanity qui échoue**

Create `lib/__tests__/sanity.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Lancer le test**

Run: `npm test`
Expected: 1 test PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: configure vitest"
```

---

## Task 4: Utilitaires de formatage (TDD)

**Files:**
- Create: `lib/utils.ts` (étendre le fichier généré par shadcn), `lib/__tests__/utils.test.ts`

**Interfaces:**
- Produces:
  - `formatEuros(cents: number): string` → ex. `formatEuros(12500)` === `"125,00 €"`
  - `formatDateRange(start: Date, end: Date): string` → ex. `"17 juin 2026, 14:00 – 18:00"`
  - `cn(...)` (déjà fourni par shadcn — ne pas réécrire)

- [ ] **Step 1: Écrire les tests qui échouent**

Create `lib/__tests__/utils.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatEuros, formatDateRange } from "@/lib/utils";

describe("formatEuros", () => {
  it("formats cents to euros with comma decimal", () => {
    expect(formatEuros(12500)).toBe("125,00 €");
  });
  it("formats zero", () => {
    expect(formatEuros(0)).toBe("0,00 €");
  });
  it("formats single cent values", () => {
    expect(formatEuros(5)).toBe("0,05 €");
  });
});

describe("formatDateRange", () => {
  it("formats same-day range with hours", () => {
    const start = new Date("2026-06-17T14:00:00");
    const end = new Date("2026-06-17T18:00:00");
    const result = formatDateRange(start, end);
    expect(result).toContain("17");
    expect(result).toContain("14:00");
    expect(result).toContain("18:00");
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- utils`
Expected: FAIL — `formatEuros is not a function`.

- [ ] **Step 3: Implémenter les fonctions**

Add to `lib/utils.ts` (garder le `cn` existant en haut) :
```ts
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function formatEuros(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(euros);
}

export function formatDateRange(start: Date, end: Date): string {
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${format(start, "d MMMM yyyy, HH:mm", { locale: fr })} – ${format(end, "HH:mm", { locale: fr })}`;
  }
  return `${format(start, "d MMM yyyy HH:mm", { locale: fr })} → ${format(end, "d MMM yyyy HH:mm", { locale: fr })}`;
}
```
Note : `Intl.NumberFormat` `fr-FR` produit un espace insécable avant `€`. Si le test échoue sur l'espace, normaliser le test avec `.replace(/ | /g, " ")` des deux côtés, ou comparer avec `toContain("125,00")`.

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npm test -- utils`
Expected: tous PASS. (Ajuster l'assertion d'espace si nécessaire comme noté.)

- [ ] **Step 5: Commit**

```bash
git add lib/utils.ts lib/__tests__/utils.test.ts
git commit -m "feat: add euro and date formatting utilities"
```

---

## Task 5: Système de thème centralisé (TDD)

**Files:**
- Create: `lib/theme.ts`, `lib/__tests__/theme.test.ts`
- Modify: `app/globals.css`, `app/layout.tsx`, `tailwind.config.ts`

**Interfaces:**
- Produces:
  - `theme` object : `{ business: { name, logo, tagline }, colors: { background, foreground, primary, secondary, muted }, fonts: { display, body }, radius }`
  - `themeToCssVars(theme): Record<string, string>` → `{ "--color-primary": "#B4502E", ... }`

- [ ] **Step 1: Écrire le test qui échoue**

Create `lib/__tests__/theme.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { theme, themeToCssVars } from "@/lib/theme";

describe("theme", () => {
  it("exposes business identity", () => {
    expect(theme.business.name).toBe("La Grange Lyotaine");
  });
  it("defines the core palette", () => {
    expect(theme.colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.colors.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe("themeToCssVars", () => {
  it("maps colors to CSS custom properties", () => {
    const vars = themeToCssVars(theme);
    expect(vars["--color-primary"]).toBe(theme.colors.primary);
    expect(vars["--color-background"]).toBe(theme.colors.background);
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- theme`
Expected: FAIL — module `@/lib/theme` introuvable.

- [ ] **Step 3: Implémenter le thème**

Create `lib/theme.ts`:
```ts
export const theme = {
  business: {
    name: "La Grange Lyotaine",
    logo: "/logo.svg",
    tagline: "Un lieu chaleureux pour travailler, se réunir et créer.",
  },
  colors: {
    background: "#F7F4EF", // pierre / sable clair
    foreground: "#1F1B16", // encre profonde
    primary: "#B4502E",    // terracotta / bois
    secondary: "#7C8B6B",  // vert sauge
    muted: "#EAE4DB",      // surface secondaire
  },
  fonts: {
    display: "Bricolage Grotesque",
    body: "DM Sans",
  },
  radius: "1rem",
} as const;

export type Theme = typeof theme;

export function themeToCssVars(t: Theme): Record<string, string> {
  return {
    "--color-background": t.colors.background,
    "--color-foreground": t.colors.foreground,
    "--color-primary": t.colors.primary,
    "--color-secondary": t.colors.secondary,
    "--color-muted": t.colors.muted,
    "--radius": t.radius,
  };
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npm test -- theme`
Expected: tous PASS.

- [ ] **Step 5: Charger les polices et injecter les variables au root layout**

Replace `app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { theme, themeToCssVars } from "@/lib/theme";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: theme.business.name,
  description: theme.business.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cssVars = themeToCssVars(theme) as React.CSSProperties;
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body style={cssVars} className="bg-background text-foreground font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Câbler les CSS variables dans Tailwind**

Replace the content of `app/globals.css` with:
```css
@import "tailwindcss";

@theme inline {
  --color-background: var(--color-background);
  --color-foreground: var(--color-foreground);
  --color-primary: var(--color-primary);
  --color-secondary: var(--color-secondary);
  --color-muted: var(--color-muted);
  --font-display: var(--font-display);
  --font-body: var(--font-body);
  --radius-lg: var(--radius);
}

body {
  font-family: var(--font-body), system-ui, sans-serif;
}

h1, h2, h3, .font-display {
  font-family: var(--font-display), system-ui, sans-serif;
}
```
Note : Tailwind v4 (livré par create-next-app récent) utilise `@import "tailwindcss"` + `@theme`. Si le projet est en Tailwind v3 (`tailwind.config.ts` avec `content`), définir plutôt les couleurs dans `tailwind.config.ts` `theme.extend.colors` en pointant vers `var(--color-*)` et garder `@tailwind base/components/utilities` dans le CSS. Vérifier la version installée avant d'écrire ce fichier.

- [ ] **Step 7: Vérifier le build**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: centralized theme system with CSS variables and fonts"
```

---

## Task 6: Variables d'environnement

**Files:**
- Create: `.env`, `.env.example`
- Modify: `.gitignore` (vérifier que `.env` y est)

**Interfaces:**
- Produces: variables d'env disponibles pour Prisma et NextAuth.

- [ ] **Step 1: Créer `.env.example` (committé)**

Create `.env.example`:
```bash
# Base de données NeonDB
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/neondb?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="change-me-generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Mode démo : true = intégrations simulées + reset démo autorisé
DEMO_MODE="true"

# Brevo (optionnel — si absent et DEMO_MODE=true, emails simulés)
BREVO_API_KEY=""

# Google Calendar Service Account (optionnel — si absent, events simulés)
GOOGLE_SERVICE_ACCOUNT_JSON=""
GOOGLE_CALENDAR_ID=""

# Embeddabilité : domaines autorisés en iframe (vide = pas de restriction)
ALLOWED_FRAME_ANCESTORS=""
```

- [ ] **Step 2: Créer `.env` réel (NON committé)**

Create `.env` avec la vraie chaîne NeonDB fournie. `DATABASE_URL` = chaîne pooler complète. `DIRECT_URL` = même chaîne en retirant `-pooler` du host :
```bash
DATABASE_URL="postgresql://neondb_owner:npg_sipX47vHaujo@ep-spring-heart-ab5xdlyp-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://neondb_owner:npg_sipX47vHaujo@ep-spring-heart-ab5xdlyp.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
NEXTAUTH_SECRET="<générer: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
DEMO_MODE="true"
BREVO_API_KEY=""
GOOGLE_SERVICE_ACCOUNT_JSON=""
GOOGLE_CALENDAR_ID=""
ALLOWED_FRAME_ANCESTORS=""
```
Générer le secret : `openssl rand -base64 32` (ou sous PowerShell : `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))`).

- [ ] **Step 3: Vérifier le gitignore**

Confirmer que `.gitignore` contient `.env*` mais PAS `.env.example` (create-next-app ignore `.env*` ; ajouter `!.env.example` pour forcer le suivi de l'exemple).
Add to `.gitignore` if missing:
```
.env*
!.env.example
```

- [ ] **Step 4: Vérifier que `.env` n'est pas suivi**

Run: `git status`
Expected: `.env.example` apparaît comme nouveau fichier ; `.env` n'apparaît PAS.

- [ ] **Step 5: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: document environment variables"
```

---

## Task 7: Schéma Prisma + migration

**Files:**
- Create: `prisma/schema.prisma`, `lib/db.ts`
- Modify: `package.json` (script seed + postinstall)

**Interfaces:**
- Produces:
  - Client Prisma généré, importable via `import { prisma } from "@/lib/db"`.
  - Toutes les tables créées sur NeonDB.

- [ ] **Step 1: Créer le schéma Prisma**

Create `prisma/schema.prisma` (copier intégralement la section 5 du spec) :
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Resource {
  id                 String        @id @default(cuid())
  slug               String        @unique
  name               String
  type               ResourceType
  description        String?
  capacity           Int           @default(1)
  requiresValidation Boolean       @default(false)
  images             String[]      @default([])
  active             Boolean       @default(true)
  sortOrder          Int           @default(0)
  pricings           Pricing[]
  reservations       Reservation[]
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
}

enum ResourceType {
  COWORKING
  MEETING_ROOM
  EVENT_SPACE
  OFFICE
}

model Pricing {
  id         String      @id @default(cuid())
  resource   Resource    @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  resourceId String
  unit       BookingUnit
  priceCents Int
  label      String?
  sortOrder  Int         @default(0)

  @@unique([resourceId, unit])
}

enum BookingUnit {
  HOUR
  HALF_DAY
  DAY
  MONTH
}

model Reservation {
  id            String            @id @default(cuid())
  resource      Resource          @relation(fields: [resourceId], references: [id])
  resourceId    String
  customerName  String
  customerEmail String
  customerPhone String?
  company       String?
  startAt       DateTime
  endAt         DateTime
  unit          BookingUnit
  status        ReservationStatus @default(PENDING)
  totalCents    Int
  message       String?
  confirmationEmailSentAt DateTime?
  calendarEventId         String?
  contract      Contract?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  @@index([resourceId, startAt, endAt])
  @@index([status])
  @@index([startAt])
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  REJECTED
  CANCELLED
  COMPLETED
}

model ContractTemplate {
  id        String        @id @default(cuid())
  name      String
  appliesTo ResourceType?
  body      String        @db.Text
  active    Boolean       @default(true)
  updatedAt DateTime      @updatedAt
  createdAt DateTime      @default(now())
}

model Contract {
  id            String      @id @default(cuid())
  reservation   Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  reservationId String      @unique
  templateId    String?
  bodySnapshot  String      @db.Text
  pdfUrl        String?
  sentAt        DateTime?
  createdAt     DateTime    @default(now())
}

model ClosedPeriod {
  id      String   @id @default(cuid())
  startAt DateTime
  endAt   DateTime
  reason  String?

  @@index([startAt, endAt])
}

model Settings {
  id           String  @id @default(cuid())
  businessName String
  contactEmail String
  contactPhone String?
  fromEmail    String
  address      String?
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  role      Role     @default(ADMIN)
  createdAt DateTime @default(now())
}

enum Role {
  ADMIN
}
```

- [ ] **Step 2: Créer le singleton client Prisma**

Create `lib/db.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Configurer le script seed**

Modify `package.json`, ajouter au niveau racine :
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```
Et dans `"scripts"`, ajouter :
```json
"db:seed": "tsx prisma/seed.ts",
"db:reset": "prisma migrate reset --force"
```

- [ ] **Step 4: Créer et appliquer la migration**

Run: `npx prisma migrate dev --name init`
Expected: migration créée dans `prisma/migrations/`, appliquée sur NeonDB, client généré. Si erreur de connexion sur `DIRECT_URL`, vérifier que le host n'a pas `-pooler`.

- [ ] **Step 5: Vérifier les tables**

Run: `npx prisma studio` (ouvre un navigateur) OU `npx prisma db pull --print | head -20`
Expected: les modèles sont présents en base. Fermer Prisma Studio.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/db.ts package.json
git commit -m "feat: prisma schema and initial migration"
```

---

## Task 8: Seed de démo « La Grange Lyotaine »

**Files:**
- Create: `prisma/seed.ts`

**Interfaces:**
- Consumes: `prisma` (lib/db non utilisé ici — le seed instancie son propre client), `bcryptjs`.
- Produces: une fonction `seed()` réutilisable (importée plus tard par la route reset). Export nommé `export async function seed()`.

- [ ] **Step 1: Écrire le seed**

Create `prisma/seed.ts`:
```ts
import { PrismaClient, ResourceType, BookingUnit, ReservationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

  // Admin
  await prisma.user.create({
    data: {
      email: "admin@demo.fr",
      password: await bcrypt.hash("demo1234", 10),
      name: "Gérant Démo",
      role: "ADMIN",
    },
  });

  // Settings
  await prisma.settings.create({
    data: {
      businessName: "La Grange Lyotaine",
      contactEmail: "contact@grange-lyotaine.fr",
      contactPhone: "04 78 00 00 00",
      fromEmail: "no-reply@grange-lyotaine.fr",
      address: "12 chemin des Vignes, 69000 Lyon",
    },
  });

  // Espaces + tarifs
  const grandeSalle = await prisma.resource.create({
    data: {
      slug: "grande-salle",
      name: "La Grande Salle",
      type: ResourceType.EVENT_SPACE,
      description: "Salle de 59 m² baignée de lumière, idéale pour séminaires, formations et événements jusqu'à 40 personnes.",
      capacity: 1,
      requiresValidation: true,
      sortOrder: 1,
      images: ["/demo/grande-salle.jpg"],
      pricings: {
        create: [
          { unit: BookingUnit.HALF_DAY, priceCents: 25000, label: "Demi-journée", sortOrder: 1 },
          { unit: BookingUnit.DAY, priceCents: 45000, label: "Journée", sortOrder: 2 },
        ],
      },
    },
  });

  const coworking = await prisma.resource.create({
    data: {
      slug: "espace-coworking",
      name: "Espace Coworking",
      type: ResourceType.COWORKING,
      description: "8 postes en open-space dans une ambiance bois et plantes. Café à volonté, fibre, réservation immédiate.",
      capacity: 8,
      requiresValidation: false,
      sortOrder: 2,
      images: ["/demo/coworking.jpg"],
      pricings: {
        create: [
          { unit: BookingUnit.HALF_DAY, priceCents: 1500, label: "Demi-journée", sortOrder: 1 },
          { unit: BookingUnit.DAY, priceCents: 2500, label: "Journée", sortOrder: 2 },
        ],
      },
    },
  });

  const salleReunion = await prisma.resource.create({
    data: {
      slug: "salle-reunion",
      name: "Salle de Réunion",
      type: ResourceType.MEETING_ROOM,
      description: "Salle de réunion pour 10 personnes, écran, paperboard et visio.",
      capacity: 1,
      requiresValidation: true,
      sortOrder: 3,
      images: ["/demo/salle-reunion.jpg"],
      pricings: {
        create: [
          { unit: BookingUnit.HOUR, priceCents: 3000, label: "Heure", sortOrder: 1 },
          { unit: BookingUnit.HALF_DAY, priceCents: 9000, label: "Demi-journée", sortOrder: 2 },
        ],
      },
    },
  });

  const bureau1 = await prisma.resource.create({
    data: {
      slug: "bureau-1",
      name: "Bureau Privatif n°1",
      type: ResourceType.OFFICE,
      description: "Bureau fermé pour 2 personnes, mobilier inclus, accès 24/7.",
      capacity: 1,
      requiresValidation: true,
      sortOrder: 4,
      images: ["/demo/bureau-1.jpg"],
      pricings: { create: [{ unit: BookingUnit.MONTH, priceCents: 45000, label: "Mensuel", sortOrder: 1 }] },
    },
  });

  const bureau2 = await prisma.resource.create({
    data: {
      slug: "bureau-2",
      name: "Bureau Privatif n°2",
      type: ResourceType.OFFICE,
      description: "Bureau fermé pour 4 personnes, lumineux, vue sur cour.",
      capacity: 1,
      requiresValidation: true,
      sortOrder: 5,
      images: ["/demo/bureau-2.jpg"],
      pricings: { create: [{ unit: BookingUnit.MONTH, priceCents: 65000, label: "Mensuel", sortOrder: 1 }] },
    },
  });

  // Modèle de contrat global
  await prisma.contractTemplate.create({
    data: {
      name: "Contrat de location standard",
      appliesTo: null,
      active: true,
      body: [
        "CONTRAT DE MISE À DISPOSITION D'ESPACE",
        "",
        "Entre {{nom_lieu}}, sis {{adresse_lieu}},",
        "et {{client_nom}} ({{client_email}}){{#societe}}, société {{societe}}{{/societe}}.",
        "",
        "Espace réservé : {{espace}}",
        "Période : du {{date_debut}} au {{date_fin}} ({{unite}})",
        "Montant total : {{montant}}",
        "",
        "Le présent contrat confirme la réservation ci-dessus. Le règlement intérieur du lieu s'applique.",
        "",
        "Fait à Lyon. Pour {{nom_lieu}}.",
      ].join("\n"),
    },
  });

  // Réservations d'exemple — dates relatives à maintenant
  const now = new Date();
  const at = (dayOffset: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const samples = [
    { resourceId: coworking.id, name: "Julie Martin", email: "julie@exemple.fr", unit: BookingUnit.DAY, status: ReservationStatus.CONFIRMED, start: at(1, 9), end: at(1, 18), total: 2500 },
    { resourceId: coworking.id, name: "Karim Benali", email: "karim@exemple.fr", unit: BookingUnit.HALF_DAY, status: ReservationStatus.CONFIRMED, start: at(2, 9), end: at(2, 13), total: 1500 },
    { resourceId: grandeSalle.id, name: "Asso Lyon Tech", email: "contact@lyontech.fr", company: "Lyon Tech", unit: BookingUnit.DAY, status: ReservationStatus.PENDING, start: at(5, 9), end: at(5, 18), total: 45000 },
    { resourceId: grandeSalle.id, name: "Formation Pro", email: "rh@formationpro.fr", company: "FormationPro", unit: BookingUnit.HALF_DAY, status: ReservationStatus.PENDING, start: at(7, 14), end: at(7, 18), total: 25000 },
    { resourceId: salleReunion.id, name: "Cabinet Durand", email: "durand@cabinet.fr", company: "Cabinet Durand", unit: BookingUnit.HALF_DAY, status: ReservationStatus.CONFIRMED, start: at(3, 9), end: at(3, 13), total: 9000 },
    { resourceId: salleReunion.id, name: "Léa Petit", email: "lea@exemple.fr", unit: BookingUnit.HOUR, status: ReservationStatus.PENDING, start: at(4, 10), end: at(4, 11), total: 3000 },
    { resourceId: coworking.id, name: "Tom Bernard", email: "tom@exemple.fr", unit: BookingUnit.DAY, status: ReservationStatus.COMPLETED, start: at(-3, 9), end: at(-3, 18), total: 2500 },
    { resourceId: grandeSalle.id, name: "Mariage Dupont", email: "dupont@exemple.fr", unit: BookingUnit.DAY, status: ReservationStatus.COMPLETED, start: at(-7, 9), end: at(-7, 18), total: 45000 },
    { resourceId: bureau1.id, name: "Freelance Co", email: "hello@freelance.co", company: "Freelance Co", unit: BookingUnit.MONTH, status: ReservationStatus.CONFIRMED, start: at(0, 0), end: at(30, 0), total: 45000 },
    { resourceId: salleReunion.id, name: "Studio Vidéo", email: "studio@exemple.fr", unit: BookingUnit.HALF_DAY, status: ReservationStatus.COMPLETED, start: at(-2, 14), end: at(-2, 18), total: 9000 },
  ];

  for (const s of samples) {
    await prisma.reservation.create({
      data: {
        resourceId: s.resourceId,
        customerName: s.name,
        customerEmail: s.email,
        company: s.company ?? null,
        startAt: s.start,
        endAt: s.end,
        unit: s.unit,
        status: s.status,
        totalCents: s.total,
      },
    });
  }

  console.log("✅ Seed terminé : 5 espaces, 10 réservations, 1 admin, 1 contrat type.");
}

// Exécution directe (tsx prisma/seed.ts)
seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```
Note sur `{{#societe}}...{{/societe}}` : c'est une section conditionnelle gérée par le moteur de merge en Phase 3. En Phase 1 c'est du texte stocké tel quel — pas de traitement requis ici.

- [ ] **Step 2: Lancer le seed**

Run: `npm run db:seed`
Expected: `✅ Seed terminé : 5 espaces, 10 réservations, 1 admin, 1 contrat type.`

- [ ] **Step 3: Vérifier en base**

Run: `npx prisma studio`
Expected: 5 Resource, 10 Reservation, 1 User (`admin@demo.fr`), 1 Settings, 1 ContractTemplate. Fermer Studio.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: demo seed for La Grange Lyotaine"
```

---

## Task 9: Auth NextAuth v5 (credentials + bcrypt)

**Files:**
- Create: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `middleware.ts`, `lib/auth-schema.ts`
- Modify: `.env` (NEXTAUTH_SECRET déjà présent)

**Interfaces:**
- Consumes: `prisma` (lib/db), `bcryptjs`, `User` model.
- Produces:
  - `auth`, `signIn`, `signOut`, `handlers` exportés depuis `lib/auth.ts`.
  - Session avec `user.id`, `user.email`, `user.role`.
  - Middleware qui redirige `/admin/*` non authentifié vers `/login`.

- [ ] **Step 1: Schéma Zod de login**

Create `lib/auth-schema.ts`:
```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 2: Config NextAuth v5**

Create `lib/auth.ts`:
```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/auth-schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
```

- [ ] **Step 3: Route handler**

Create `app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 4: Middleware de protection**

Create `middleware.ts`:
```ts
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isAdmin = req.nextUrl.pathname.startsWith("/admin");
  if (isAdmin && !req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 5: Vérifier la compilation**

Run: `npm run build`
Expected: build réussi (les pages `/login` et `/admin` n'existent pas encore mais le middleware/route compilent).

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts lib/auth-schema.ts app/api/auth middleware.ts
git commit -m "feat: NextAuth v5 credentials auth with route protection"
```

---

## Task 10: Page de connexion admin

**Files:**
- Create: `app/login/page.tsx`, `app/login/login-form.tsx`, `app/login/actions.ts`

**Interfaces:**
- Consumes: `signIn` (lib/auth), `loginSchema`.
- Produces: une page `/login` fonctionnelle qui authentifie et redirige vers `/admin`.

- [ ] **Step 1: Server Action de login**

Create `app/login/actions.ts`:
```ts
"use server";

import { signIn } from "@/lib/auth";
import { loginSchema } from "@/lib/auth-schema";
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
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/admin",
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

- [ ] **Step 2: Formulaire client**

Create `app/login/login-form.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined
  );
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required defaultValue="admin@demo.fr" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" name="password" type="password" required defaultValue="demo1234" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Page de login**

Create `app/login/page.tsx`:
```tsx
import { LoginForm } from "./login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { theme } from "@/lib/theme";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm rounded-lg">
        <CardHeader>
          <CardTitle className="font-display text-2xl">{theme.business.name}</CardTitle>
          <p className="text-sm text-foreground/60">Espace gérant</p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 4: Test manuel de connexion**

Run: `npm run dev`, ouvrir `http://localhost:3000/login`, se connecter avec `admin@demo.fr` / `demo1234`.
Expected: redirection vers `/admin` (qui affichera une 404 ou le placeholder de Task 11 — selon l'ordre). Tester aussi un mauvais mot de passe → message d'erreur affiché.

- [ ] **Step 5: Commit**

```bash
git add app/login
git commit -m "feat: admin login page with credentials"
```

---

## Task 11: Shell du dashboard admin (layout + navigation + garde session)

**Files:**
- Create: `app/admin/layout.tsx`, `app/admin/page.tsx`, `components/admin/sidebar.tsx`, `app/admin/actions.ts`

**Interfaces:**
- Consumes: `auth`, `signOut` (lib/auth), `prisma`.
- Produces: shell `/admin` avec navigation latérale, déconnexion, et garde de session côté serveur (double protection avec le middleware).

- [ ] **Step 1: Server Action de déconnexion**

Create `app/admin/actions.ts`:
```ts
"use server";

import { signOut } from "@/lib/auth";

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
```

- [ ] **Step 2: Sidebar de navigation**

Create `components/admin/sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/calendrier", label: "Calendrier" },
  { href: "/admin/reservations", label: "Réservations" },
  { href: "/admin/espaces", label: "Espaces" },
  { href: "/admin/contrats", label: "Modèle de contrat" },
  { href: "/admin/fermetures", label: "Fermetures" },
  { href: "/admin/reglages", label: "Réglages" },
];

export function Sidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-4 px-2 font-display text-lg font-semibold">{businessName}</div>
      {links.map((l) => {
        const active = l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-primary text-white" : "hover:bg-muted"
            )}
          >
            {l.label}
          </Link>
        );
      })}
      <form action={logoutAction} className="mt-auto">
        <Button type="submit" variant="ghost" className="w-full justify-start">
          Déconnexion
        </Button>
      </form>
    </nav>
  );
}
```

- [ ] **Step 3: Layout admin avec garde session**

Create `app/admin/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const settings = await prisma.settings.findFirst();
  const businessName = settings?.businessName ?? "Administration";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-muted bg-white md:block">
        <Sidebar businessName={businessName} />
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```
Note responsive : la sidebar mobile (drawer) sera ajoutée en Phase 3 (polish). En Phase 1, masquée sous `md`.

- [ ] **Step 4: Placeholder vue d'ensemble**

Create `app/admin/page.tsx`:
```tsx
import { prisma } from "@/lib/db";

export default async function AdminHome() {
  const [pending, total] = await Promise.all([
    prisma.reservation.count({ where: { status: "PENDING" } }),
    prisma.reservation.count(),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Vue d'ensemble</h1>
      <p className="text-foreground/70">
        {pending} demande(s) en attente · {total} réservation(s) au total.
      </p>
      <p className="text-sm text-foreground/50">
        Les KPIs détaillés et le calendrier arrivent en Phase 3.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Test manuel**

Run: `npm run dev`, se connecter, vérifier `/admin` affiche « X demande(s) en attente · 10 réservation(s) au total » (cohérent avec le seed : 3 PENDING). Cliquer sur les liens de la sidebar (404 attendues sauf `/admin` — c'est normal en Phase 1). Tester la déconnexion → retour `/login`. Tester l'accès direct à `/admin` en navigation privée → redirection `/login`.

- [ ] **Step 6: Commit**

```bash
git add app/admin components/admin
git commit -m "feat: protected admin dashboard shell with navigation"
```

---

## Self-Review (Phase 1)

**Spec coverage (étape 1-3 du build order) :**
- ✅ Scaffold Next.js 15 + TS + Tailwind + shadcn — Tasks 1-2
- ✅ Prisma + NeonDB + schéma + migration — Task 7
- ✅ Seed — Task 8
- ✅ Thème centralisé (re-skin) — Task 5
- ✅ Auth admin NextAuth v5 — Tasks 9-10
- ✅ Shell dashboard + nav + protection routes — Task 11
- ✅ `.env` / `.env.example` documentés — Task 6

**Différé aux phases suivantes (intentionnel) :** CRUD espaces, flux public, booking engine (Phase 2) ; intégrations, calendrier, polish responsive, reset démo (Phase 3).

**Type consistency :** `seed()` exporté (réutilisé Phase 3 reset). `prisma` singleton importé partout via `@/lib/db` sauf dans `seed.ts` (client dédié, intentionnel). `theme`/`themeToCssVars` cohérents entre `theme.ts`, layout et CSS.

**Placeholder scan :** la sidebar pointe vers des routes créées en Phases 2-3 (404 temporaires assumées et documentées dans les tests manuels).
