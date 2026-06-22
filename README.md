# Réservation Multi-Espaces — « La Grange Lyotaine » (démo)

Web app de gestion de réservations pour lieu polyvalent (coworking, salles, bureaux).
Espace public de réservation + dashboard admin. Re-skinnable, embeddable, mode démo.

## Stack

Next.js 16 · TypeScript · Tailwind v4 + shadcn/ui (base-ui) · Prisma 7 + PostgreSQL (NeonDB) · NextAuth v5 (Auth.js beta) · Brevo · Google Calendar (Service Account) · @react-pdf/renderer

## Installation

```bash
npm install
cp .env.example .env   # renseigner DATABASE_URL / DIRECT_URL / NEXTAUTH_SECRET au minimum
npx prisma migrate dev
npm run db:seed
npm run dev
```

App : http://localhost:3000 · Admin : http://localhost:3000/admin

> **Note :** `prisma.config.ts` configure le datasource avec `DIRECT_URL` (connexion directe, non-poolée). C'est cette URL que Prisma utilise pour `migrate` et `seed`. `DATABASE_URL` (pooler) est utilisé par le client à l'exécution.

## Variables d'environnement (.env)

Copier `.env.example` → `.env` et renseigner les valeurs. Avec `DEMO_MODE="true"`, aucune clé externe n'est requise.

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | Oui | NeonDB pooler — utilisé par le client Next.js à l'exécution |
| `DIRECT_URL` | Oui | NeonDB connexion directe — utilisé par Prisma migrate/seed |
| `NEXTAUTH_SECRET` | Oui | Secret JWT NextAuth (générer : `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Oui | URL de base de l'app (ex. `http://localhost:3000`) |
| `AUTH_TRUST_HOST` | Prod | Mettre `true` hors Vercel pour que Auth.js accepte le host |
| `DEMO_MODE` | Non | `true` = emails et events Google simulés (logs console) — aucune clé externe requise |
| `BREVO_API_KEY` | Non | Clé Brevo. Optionnel si `DEMO_MODE=true` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Non | JSON du Service Account Google (inline, minifié). Optionnel si `DEMO_MODE=true` |
| `GOOGLE_CALENDAR_ID` | Non | ID du calendrier Google cible. Optionnel si `DEMO_MODE=true` |
| `ALLOWED_FRAME_ANCESTORS` | Non | Domaines autorisés à embarquer l'app en iframe (vide = pas de restriction) |
| `TZ` | Prod | Fuseau horaire du lieu (ex. `Europe/Paris`). Doit être défini sur le serveur de déploiement |

**DEMO_MODE=true** : emails et events Google Calendar sont simulés par des logs console (`📧 [SIMULÉ]` / `📅 [SIMULÉ]`). Aucune clé Brevo ni Google n'est nécessaire.

## Identifiants démo

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | `admin@demo.fr` | `demo1234` |

## Re-skin (nouveau client en 5 min)

Éditer **deux fichiers** (ils doivent rester synchronisés) :

1. **`lib/theme.ts`** — nom, logo, couleurs, polices, radius (objet TypeScript canonique).
2. **`app/globals.css`** — bloc `:root` des variables CSS `--primary`, `--secondary`, etc.

Les classes utilitaires Tailwind v4 (`bg-primary`, `text-secondary`, …) résolvent leurs valeurs depuis les variables CSS à la compilation. `lib/theme.ts` injecte des styles inline sur `<body>` pour les composants qui lisent `--color-*` directement. Les deux fichiers doivent donc refléter les mêmes valeurs.

Remplacer également `public/logo.svg` par le logo du client.

## Réinitialiser la démo

- Bouton **« Réinitialiser la démo »** dans Admin → Réglages (disponible si `DEMO_MODE=true`).
- Ou en ligne de commande : `npm run db:seed`

## Script de démo (à dérouler en live)

### Prérequis

`DEMO_MODE="true"` dans `.env`. Lancer `npm run db:seed && npm run dev`.

### Étapes

**1. Coworking — réservation immédiate**
Ouvrir `/`, cliquer sur « Espace Coworking », choisir une date future + formule journée, remplir le formulaire, soumettre. Page de confirmation : **« Réservation confirmée ✅ »**. Dans les logs console : `📧 [SIMULÉ] Email de confirmation` + `📅 [SIMULÉ] Event agenda`.

**2. Grande salle — réservation sur demande**
Revenir sur `/`, ouvrir « La Grande Salle », réserver une demi-journée. Page de retour : **« Demande bien reçue ✨ »** (statut `PENDING`).

**3. Validation admin**
Se connecter sur `/login` avec `admin@demo.fr` / `demo1234`. Aller dans **Réservations**, filtrer « En attente », cliquer **Valider** sur la demande grande salle.

**4. Automatisations déclenchées**
La validation déclenche en arrière-plan : email de confirmation (Brevo) + contrat PDF (pièce jointe) + event Google Calendar. En mode démo, visible dans les logs console (`📧 [SIMULÉ]` / `📅 [SIMULÉ]`). En base : `confirmationEmailSentAt` et `calendarEventId` sont renseignés. Ouvrir la fiche réservation → **« Voir le contrat PDF »**.

**5. Calendrier & éditeur de contrat**
Montrer la vue **Calendrier** (créneaux colorés par espace) puis **Admin → Modèle de contrat** (éditeur de texte avec champs de fusion).

**6. Mobile responsive**
Réduire la fenêtre de navigateur : navigation admin en drawer, flux public responsive sur toutes les tailles d'écran.

## Architecture technique (points clés)

- **Middleware de protection de routes :** `proxy.ts` (nom Next.js 16 pour l'ancien `middleware.ts`) — redirige vers `/login` si une route `/admin/*` est accédée sans session NextAuth.
- **Driver adapter Prisma :** `@prisma/adapter-pg` + `pg` pool. `prisma.config.ts` déclare le datasource (`DIRECT_URL`) pour migrate/seed ; le client runtime se connecte via `DATABASE_URL`.
- **Intégrations derrière interfaces :** `EmailService` et `CalendarService` ont chacun une implémentation réelle et une implémentation simulée (DEMO_MODE). Aucune fuite de dépendances externes dans les Server Actions.
- **PDF à la volée :** `@react-pdf/renderer` génère le contrat en streaming sur `/api/reservations/[id]/contract`. Pas de stockage persistant en V1.

## Déploiement (Vercel)

Repository : https://github.com/WeboPoulpe/DEMO-RESA

Variables d'environnement à renseigner sur Vercel (en plus des variables DB et NEXTAUTH) :

```
AUTH_TRUST_HOST=true
TZ=Europe/Paris
DEMO_MODE=true        # ou false si Brevo + Google Calendar configurés
```

## Notes production (hors-périmètre V1)

- Stockage PDF persistant (Vercel Blob) — actuellement généré à la volée, non conservé.
- Google Calendar via OAuth complet (V1 = Service Account uniquement).
- Paiement Stripe, facturation, comptes clients, tarification dynamique.
- **⚠️ Régénérer le mot de passe NeonDB avant toute mise en production réelle.**
