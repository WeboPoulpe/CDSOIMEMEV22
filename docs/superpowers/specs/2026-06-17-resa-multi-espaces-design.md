# Web app de réservation multi-espaces — Design (V1 / démo réutilisable)

**Date :** 2026-06-17
**Statut :** Validé en brainstorming, prêt pour le plan d'implémentation

---

## 1. Contexte & objectif

Web app de gestion de réservations pour un lieu polyvalent (coworking, salles de réunion,
salles de séminaire/formation, bureaux loués). Application **autonome** (propre domaine,
ex. `resa.mon-client.fr`), destinée à être **liée ou embarquée** depuis un site WordPress
existant (bouton « Réserver » ou iframe), sans toucher au site.

C'est un **MVP/démo** présenté en live à un prospect, conçu pour être **re-skinné et réutilisé**
pour d'autres clients du même secteur. Construit proprement, pensé produit.

**Objectif business :** centraliser les réservations, réduire les saisies manuelles,
fiabiliser les e-mails, automatiser l'envoi des contrats/documents, tout en gardant une
**validation humaine** sur les espaces sensibles (la grande salle).

Deux faces :
1. **Espace public** — les clients consultent les espaces, choisissent un créneau, envoient une demande.
2. **Dashboard admin sécurisé** — le gérant pilote tout : réservations, validation, tarifs, contrats, agenda.

L'app doit être **belle et fluide** (démo live) : UI soignée, états vides, responsive mobile, micro-détails.

---

## 2. Stack imposée

- **Next.js 15** (App Router, Server Actions, TypeScript strict)
- **Tailwind CSS** + **shadcn/ui**
- **Prisma** ORM + **PostgreSQL** (NeonDB)
- **NextAuth v5 (Auth.js)** — credentials (email + mot de passe) pour l'admin
- **Brevo** pour les e-mails transactionnels (API)
- **Google Calendar API** via **Service Account** pour la synchro d'agenda
- **@react-pdf/renderer** pour la génération des contrats PDF
- **react-big-calendar** pour le calendrier admin
- **Zod** pour la validation des entrées
- Déploiement cible : **Vercel**
- Montants en **centimes (Int)**, devise EUR

Toutes les clés/secrets dans `.env`, avec un `.env.example` documenté (placeholders uniquement).

---

## 3. Décisions d'architecture (tranchées en brainstorming)

| # | Décision | Choix retenu | Justification |
|---|----------|--------------|---------------|
| 1 | Calendrier admin | **react-big-calendar** | Open source, pas de friction de licence, suffisant pour mois/semaine, style overridable via Tailwind |
| 2 | Stockage PDF contrats | **Génération à la volée** (pas de stockage) | Démo standalone re-skinnable, PDF déterministe toujours à jour, zéro dépendance externe. **⚠️ Stockage persistant (Vercel Blob) = à faire pour la prod** |
| 3 | Google Calendar | **Service Account** | Pas de flux OAuth interactif, une clé JSON suffit, fonctionne réellement en démo. OAuth complet = évolution future |
| 4 | Organisation du code | **Hybride** (route groups + `lib/` par domaine) | Lisibilité Next.js des routes + cœur métier isolé et testable |
| 5 | Flux public | **Server Actions** (pas d'API routes exposées) | Sécurité, simplicité, embeddabilité maîtrisée |

---

## 4. Arborescence du projet

```
resa-app/
├── app/
│   ├── (public)/                      # face publique — layout sans auth, embeddable
│   │   ├── layout.tsx                 # applique le thème, CSP frame-ancestors
│   │   ├── page.tsx                   # accueil : présentation + cartes espaces
│   │   ├── reserver/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx           # page espace : photos, tarifs, sélecteur créneau
│   │   │       └── confirmation/
│   │   │           └── page.tsx       # confirmation (immédiate ou « demande reçue »)
│   │   └── actions.ts                 # Server Actions publiques (createReservation)
│   │
│   ├── admin/                         # face admin — protégée NextAuth
│   │   ├── layout.tsx                 # shell : sidebar nav + garde de session
│   │   ├── page.tsx                   # vue d'ensemble (KPIs, prochaines résa)
│   │   ├── calendrier/page.tsx        # react-big-calendar multi-ressources
│   │   ├── reservations/
│   │   │   ├── page.tsx               # liste + filtres + recherche
│   │   │   └── [id]/
│   │   │       ├── page.tsx           # détail + actions Valider/Refuser
│   │   │       └── contract.pdf/route.ts  # génération PDF à la volée
│   │   ├── espaces/                   # CRUD ressources + grille tarifaire
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── contrats/page.tsx          # éditeur de modèle (merge fields)
│   │   ├── fermetures/page.tsx        # ClosedPeriod CRUD
│   │   ├── reglages/page.tsx          # Settings du lieu
│   │   └── actions.ts                 # Server Actions admin (validate, reject, CRUD)
│   │
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── demo/reset/route.ts        # reset démo (rejoue le seed, si DEMO_MODE)
│   │
│   ├── login/page.tsx                 # connexion admin
│   ├── layout.tsx                     # root layout : fonts, CSS variables du thème
│   └── globals.css
│
├── lib/
│   ├── booking/
│   │   ├── availability.ts            # calcul dispo (capacity + overlap + ClosedPeriod)
│   │   ├── pricing.ts                 # calcul total selon unité/grille
│   │   └── schema.ts                  # Zod : ReservationInput, slot validation
│   ├── contracts/
│   │   ├── merge.ts                   # template {{champs}} → texte rempli
│   │   └── pdf.tsx                    # @react-pdf/renderer → buffer PDF
│   ├── integrations/
│   │   ├── email.ts                   # Brevo (interface + impl + demo fallback)
│   │   ├── calendar.ts                # Google Service Account (+ demo fallback)
│   │   └── types.ts                   # interfaces EmailService / CalendarService
│   ├── auth.ts                        # config NextAuth v5
│   ├── db.ts                          # client Prisma singleton
│   ├── theme.ts                       # 🎨 config centralisée (re-skin ici)
│   └── utils.ts                       # cn(), formatage dates/montants
│
├── components/
│   ├── ui/                            # shadcn/ui (généré)
│   ├── public/                        # ResourceCard, SlotPicker, BookingForm…
│   └── admin/                         # StatusBadge, ReservationTable, CalendarView…
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                        # « La Grange Lyotaine »
│
├── public/                            # logos, images de démo
├── .env.example                       # documenté
├── components.json                    # config shadcn
├── README.md                          # install + .env + identifiants + script démo
└── ...config (next, tailwind, ts, prisma)
```

**Points notables :**
- `lib/theme.ts` = point unique de re-skin (nom, logo, couleurs, polices → CSS variables au root layout).
- `lib/integrations/` derrière des interfaces (`types.ts`) → branchement/débranchement et mode démo propres.
- PDF en `route.ts` (génération à la volée) — aucun stockage externe.
- `lib/booking/` = cœur métier isolé, testable indépendamment.

---

## 5. Modèle de données (Prisma — schéma final)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooler (runtime)
  directUrl = env("DIRECT_URL")     // non-pooled (migrate/seed)
}

// ───────────── Espaces réservables ─────────────
model Resource {
  id                 String        @id @default(cuid())
  slug               String        @unique
  name               String
  type               ResourceType
  description        String?
  capacity           Int           @default(1)      // coworking = N, salle/bureau = 1
  requiresValidation Boolean       @default(false)
  images             String[]      @default([])
  active             Boolean       @default(true)
  sortOrder          Int           @default(0)       // ordre d'affichage public
  pricings           Pricing[]
  reservations       Reservation[]
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
}

enum ResourceType {
  COWORKING
  MEETING_ROOM     // grande salle
  EVENT_SPACE      // séminaire / formation
  OFFICE           // bureau loué
}

// ───────────── Tarifs ─────────────
model Pricing {
  id         String      @id @default(cuid())
  resource   Resource    @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  resourceId String
  unit       BookingUnit
  priceCents Int
  label      String?
  sortOrder  Int         @default(0)

  @@unique([resourceId, unit])   // un tarif par unité par espace
}

enum BookingUnit {
  HOUR
  HALF_DAY
  DAY
  MONTH            // bureaux loués
}

// ───────────── Réservations ─────────────
model Reservation {
  id            String            @id @default(cuid())
  resource      Resource          @relation(fields: [resourceId], references: [id])
  resourceId    String
  // Client (pas de compte requis en V1)
  customerName  String
  customerEmail String
  customerPhone String?
  company       String?
  // Créneau
  startAt       DateTime
  endAt         DateTime
  unit          BookingUnit
  status        ReservationStatus @default(PENDING)
  totalCents    Int
  message       String?
  // Suivi automatisations (utile pour mode démo / debug)
  confirmationEmailSentAt DateTime?
  calendarEventId         String?
  contract      Contract?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  @@index([resourceId, startAt, endAt])   // requêtes de disponibilité
  @@index([status])
  @@index([startAt])                       // calendrier / vue d'ensemble
}

enum ReservationStatus {
  PENDING       // en attente de validation
  CONFIRMED     // validée
  REJECTED      // refusée
  CANCELLED     // annulée
  COMPLETED     // passée
}

// ───────────── Modèle de contrat éditable ─────────────
model ContractTemplate {
  id        String        @id @default(cuid())
  name      String
  appliesTo ResourceType?   // null = global
  body      String          @db.Text   // texte riche avec {{champs}}
  active    Boolean         @default(true)
  updatedAt DateTime        @updatedAt
  createdAt DateTime        @default(now())
}

// ───────────── Contrat généré ─────────────
model Contract {
  id            String      @id @default(cuid())
  reservation   Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  reservationId String      @unique
  templateId    String?     // trace du modèle utilisé
  bodySnapshot  String      @db.Text   // contenu fusionné figé → PDF reproductible à l'identique
  pdfUrl        String?     // route à la volée en V1 ; hook pour Blob plus tard
  sentAt        DateTime?
  createdAt     DateTime    @default(now())
}

// ───────────── Fermetures ─────────────
model ClosedPeriod {
  id      String   @id @default(cuid())
  startAt DateTime
  endAt   DateTime
  reason  String?

  @@index([startAt, endAt])
}

// ───────────── Réglages du lieu ─────────────
model Settings {
  id           String  @id @default(cuid())
  businessName String
  contactEmail String
  contactPhone String?
  fromEmail    String
  address      String?
}

// ───────────── Admin (NextAuth) ─────────────
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt
  name      String?
  role      Role     @default(ADMIN)
  createdAt DateTime @default(now())
}

enum Role {
  ADMIN
}
```

**Ajustements clés vs point de départ :**
1. **Index de dispo** `[resourceId, startAt, endAt]` — requête anti-double-résa = la plus chaude.
2. **`bodySnapshot` sur Contract** — fige le texte fusionné à la génération. Le contrat envoyé
   reste reproductible même si le modèle est modifié après (cohérent avec PDF à la volée).
3. **`@@unique([resourceId, unit])`** sur Pricing — empêche deux tarifs identiques.
4. **Champs de suivi** (`confirmationEmailSentAt`, `calendarEventId`) — affichage visuel des
   automatisations en mode démo.
5. **`directUrl`** dans datasource — connexion non-pooled requise par Prisma migrate/seed (NeonDB).

---

## 6. Moteur de réservation (`lib/booking/`)

### Calcul de disponibilité (`availability.ts`)

Un créneau est disponible si :
```
(réservations chevauchantes en PENDING + CONFIRMED) < resource.capacity
ET aucun ClosedPeriod ne chevauche le créneau
```
- **Chevauchement :** `existing.startAt < slot.endAt AND existing.endAt > slot.startAt`
  (les bornes qui se touchent ne chevauchent pas).
- **Coworking** (capacity 8) → jusqu'à 8 résa simultanées → confirmation immédiate tant qu'il reste de la place.
- **Salle / bureau** (capacity 1) → toute résa active bloque le créneau.
- Génération des créneaux proposés au public selon l'unité de l'espace :
  - `HOUR` → slots horaires sur la journée
  - `HALF_DAY` → matin / après-midi
  - `DAY` → jour entier
  - `MONTH` → sélection de mois (bureaux)

### Anti double-réservation (point critique)

La vérification de capacity et la création se font dans **une transaction Prisma** (`$transaction`)
pour éviter la race condition entre deux demandes simultanées sur le dernier créneau :
```
transaction:
  1. compter les résa actives (PENDING + CONFIRMED) qui chevauchent
  2. si count >= capacity → throw SlotUnavailableError
  3. sinon créer la Reservation
```
La même garde est rejouée côté admin avant de **valider** une PENDING (le créneau a pu se remplir entre-temps).

### Calcul du total (`pricing.ts`)

Pure fonction `(resource, unit, startAt, endAt) → totalCents` :
- `HOUR` → `priceCents × nb_heures`
- `HALF_DAY` → `priceCents × nb_demi-journées`
- `DAY` → `priceCents × nb_jours`
- `MONTH` → `priceCents × nb_mois`

Le tarif vient de `Pricing[resourceId, unit]`. Unité sans tarif → erreur de validation
(Zod garantit en amont qu'on ne propose que des unités tarifées).

### Logique de statut à la création

```
if resource.requiresValidation → status = PENDING  + email « demande reçue » + notif admin
else                           → status = CONFIRMED + déclenche le workflow complet
```

### Validation des entrées (`schema.ts`, Zod)

Email valide, dates cohérentes (`endAt > startAt`), unité autorisée pour l'espace,
créneau dans le futur.

---

## 7. Workflow de validation, intégrations & mode démo

### Workflow (cœur de la démo) — `confirmReservation(reservationId)`

Appelé à la confirmation auto (coworking) **et** à la validation admin (grande salle) :
```
confirmReservation:
  1. (re-vérifier la dispo dans une transaction) → status = CONFIRMED
  2. fusionner ContractTemplate (appliesTo == type, sinon global) → bodySnapshot
  3. générer le PDF (@react-pdf/renderer, en mémoire)
  4. email Brevo au client : confirmation + PDF en pièce jointe → sentAt, confirmationEmailSentAt
  5. créer l'event Google Agenda → calendarEventId
  6. chaque étape best-effort : si une intégration échoue → log + continue
     (la résa reste CONFIRMED ; l'admin voit le statut de chaque automatisation)
```

### Interfaces d'intégration (`lib/integrations/types.ts`)

```ts
interface EmailService    { send(msg): Promise<{ id: string; simulated: boolean }> }
interface CalendarService { createEvent(evt): Promise<{ id: string; simulated: boolean }> }
```

### Mode démo (dégradation propre)

Flag `DEMO_MODE`. Chaque service détecte ses clés au démarrage :
- **Brevo** : clé absente **ou** `DEMO_MODE=true` → impl simulée qui log
  `📧 [SIMULÉ] Email à client@x.fr — Confirmation + contrat.pdf` et renvoie `simulated: true`.
  L'UI admin affiche un badge « e-mail simulé ».
- **Google Calendar** : clé service account absente **ou** `DEMO_MODE=true` → log
  `📅 [SIMULÉ] Event créé : Grande salle, 18/06 14h-18h` et renvoie un faux `id`.
- Avec les vraies clés et `DEMO_MODE=false` → tout part pour de vrai.

Le `simulated: boolean` remonte jusqu'à l'UI : en démo on montre visuellement que
l'automatisation s'est déclenchée sans dépendre d'un envoi réel. Mêmes écrans avec vraies clés.

### E-mails (4 templates, `email.ts`)

1. Demande reçue (PENDING)
2. Confirmation + contrat joint (CONFIRMED)
3. Refus (REJECTED)
4. Notification admin (nouvelle demande)

### PDF (`contracts/pdf.tsx`)

`@react-pdf/renderer` (composant React → buffer), stylé avec les couleurs du thème,
en-tête nom/logo du lieu. Servi à la volée via la route `contract.pdf` pour re-téléchargement admin.

### Champs de fusion du contrat

`{{client_nom}}`, `{{client_email}}`, `{{societe}}`, `{{espace}}`, `{{date_debut}}`,
`{{date_fin}}`, `{{unite}}`, `{{montant}}`, `{{nom_lieu}}`, `{{adresse_lieu}}`.

---

## 8. Thème centralisé, embeddabilité & seed

### Thème centralisé (`lib/theme.ts`) — re-skin en 5 minutes

```ts
export const theme = {
  business: { name: "La Grange Lyotaine", logo: "/logo.svg", tagline: "…" },
  colors: {
    background: "#F7F4EF",  // pierre/sable
    foreground: "#1F1B16",  // encre profonde
    primary:    "#B4502E",  // terracotta/bois
    secondary:  "#7C8B6B",  // vert sauge
  },
  fonts: { display: "Bricolage Grotesque", body: "DM Sans" },
  radius: "1rem",
}
```
- Injecté en **CSS variables** au root layout (`--color-primary`, etc.), consommées par
  Tailwind (`bg-primary`) et shadcn.
- Polices via `next/font/google` à partir des noms du thème.
- Re-skin nouveau client = éditer ce fichier + remplacer le logo. Aucun autre changement.

**Direction artistique :** lieu chaleureux et premium (esprit « grange rénovée », pas SaaS froid).
Coins arrondis généreux, beaucoup d'air, photos mises en valeur, micro-interactions discrètes,
mobile-first.

### Embeddabilité (iframe depuis WordPress)

- Layout `(public)` autonome (pas de dépendance à un parent).
- En-tête `Content-Security-Policy: frame-ancestors` configurable via `.env`
  (`ALLOWED_FRAME_ANCESTORS`) → le client met l'URL de son WordPress. Vide en démo = pas de restriction.
- Chaque espace deep-linkable : `/reserver/[slug]` → bouton « Réserver » WP pointe direct sur un espace.

### Seed de démo (`prisma/seed.ts`) — « La Grange Lyotaine »

- **Grande salle** (EVENT_SPACE, cap. 1, validation requise) — tarifs demi-journée / journée.
- **2 bureaux** (OFFICE, cap. 1, validation requise) — tarif mensuel.
- **Espace coworking** (COWORKING, cap. 8, sans validation) — demi-journée / journée.
- **Salle de réunion** moyenne (MEETING_ROOM, cap. 1, validation requise) — horaire / demi-journée.
- **~10 réservations** réparties (PENDING, CONFIRMED, COMPLETED) sur le mois courant
  → calendrier & dashboard vivants. *(Dates dérivées de la date courante au moment du seed.)*
- **1 ContractTemplate** global pré-rempli avec tous les `{{champs}}`.
- **1 admin** : `admin@demo.fr` / mot de passe simple (affiché dans le README).
- **Settings** du lieu pré-remplis.

### Reset démo

Route `POST /api/demo/reset` (n'agit que si `DEMO_MODE=true`) qui efface et rejoue le seed.
Bouton « Réinitialiser la démo » dans les réglages admin.

---

## 9. Fonctionnalités V1 (récapitulatif)

### A. Espace public
1. Accueil : présentation + cartes espaces par `ResourceType`.
2. Page espace `/reserver/[slug]` : description, capacité, photos, tarifs, sélecteur de créneau.
3. Disponibilité en temps réel (capacity + ClosedPeriod).
4. Formulaire de demande (nom, email, tel, société opt., message) + calcul auto du total.
5. Logique selon l'espace : sans validation → CONFIRMED immédiat + email ; avec validation → PENDING + notif admin.
6. Page de confirmation adaptée au cas.

### B. Dashboard admin (`/admin`, NextAuth)
1. Vue d'ensemble : prochaines résa, demandes en attente, chiffre du mois.
2. Calendrier mois/semaine multi-ressources, code couleur par espace + statut, lisible mobile.
3. Liste réservations : filtres (statut, espace, période), recherche, actions Valider/Refuser.
4. Gestion espaces : CRUD, photos, toggle validation, capacité, grille tarifaire administrable.
5. Éditeur de modèle de contrat (champs de fusion).
6. Périodes de fermeture.
7. Réglages (infos lieu, email expéditeur).

### C. Workflow validation + automatisation contrat
Détaillé en section 7.

---

## 10. Hors-périmètre V1 (hooks laissés en place)

- **Paiement / acompte (Stripe)** — hooks dans le workflow de confirmation.
- **Stockage PDF persistant (Vercel Blob)** — ⚠️ **À FAIRE POUR LA PROD.** V1 = génération à la
  volée (décision #2). `Contract.pdfUrl` est prévu pour brancher Blob ensuite sans toucher au reste.
- **Google Calendar OAuth complet** — V1 = Service Account. OAuth (chaque client branche son
  agenda perso) = évolution. L'interface `CalendarService` reste identique.
- **Facturation automatique.**
- **Espace client avec comptes.**
- **Tarification dynamique avancée** (saisonnalité, remises).

---

## 11. Variables d'environnement (`.env`)

| Variable | Rôle | Démo |
|----------|------|------|
| `DATABASE_URL` | NeonDB pooler (runtime) | requis |
| `DIRECT_URL` | NeonDB non-pooled (migrate/seed) | requis |
| `NEXTAUTH_SECRET` | secret session NextAuth | requis |
| `NEXTAUTH_URL` | URL de base de l'app | requis |
| `DEMO_MODE` | `true` = intégrations simulées + reset autorisé | `true` |
| `BREVO_API_KEY` | clé API Brevo | optionnel (sinon simulé) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | clé service account (agenda) | optionnel (sinon simulé) |
| `GOOGLE_CALENDAR_ID` | ID de l'agenda cible | optionnel |
| `ALLOWED_FRAME_ANCESTORS` | domaines autorisés pour iframe | vide en démo |

⚠️ Le mot de passe NeonDB fourni pendant le brainstorming doit être **régénéré** avant mise en prod.

---

## 12. Ordre de construction

1. Scaffold Next.js 15 + TS + Tailwind + shadcn/ui + Prisma + NeonDB + NextAuth v5.
2. Schéma Prisma + migration + `seed.ts`.
3. Auth admin + shell dashboard (layout, navigation, protection routes).
4. CRUD espaces + grille tarifaire + périodes de fermeture.
5. Flux public : liste espaces → page espace → dispo → formulaire → confirmation.
6. Workflow réservation : création, calcul total, anti double-résa, validation/refus admin.
7. E-mails Brevo (mode démo) branchés sur les événements.
8. Génération + envoi auto du contrat PDF (avec éditeur de modèle).
9. Synchro Google Agenda (mode démo).
10. Calendrier admin + vue d'ensemble + polish UI/responsive + reset démo.

À chaque étape : commits clairs, app toujours démontrable (jamais cassée).

---

## 13. Critères « démo réussie »

Scénario à dérouler en live sans accroc :
1. Public : réserver une place de **coworking** → confirmation **immédiate** + email.
2. Public : demander la **grande salle** → message « demande reçue ».
3. Admin : voir la **demande en attente**, la **valider en un clic**.
4. La validation déclenche **email de confirmation + contrat PDF envoyé auto + event Google Agenda**.
5. Montrer le **calendrier** rempli et l'**éditeur de contrat** modifiable.
6. Le tout **fluide sur mobile**.

Livrable final : **README** clair (install, `.env`, lancement, identifiants démo, script de démo).
