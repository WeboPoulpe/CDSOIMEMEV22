# CDSOIMEME — Espace client sécurisé · Conception

> Date : 2026-06-21
> Projet cible : **CDSOIMEMEV2** (nouveau dossier, nouveau dépôt git, nouvelle base NeonDB)
> Base de départ : duplication du projet « MAQUETTE LOgiciel resa » (Next.js 16, Prisma 7 + NeonDB, NextAuth v5, Tailwind v4, Brevo)
> Référence visuelle : V1 Lovable (https://cdsoimeme.lovable.app/) + https://www.cdsoimeme.fr/

## Contexte & objectif

Charline (CD soi-même, Sainte-Savine) propose réflexologie, énergétique, naturopathie, massages
de libération émotionnelle / bien-être et coaching de vie psycho-émotionnel, auprès d'une
clientèle de femmes. Elle veut une application avec :

- **Espace Praticienne (admin)** : Charline gère son agenda, ses clientes, des questionnaires,
  des documents et répond aux messages.
- **Espace Client (cliente)** : compte sécurisé sur invitation, consultation des prochaines
  séances, réservation en ligne, questionnaires à remplir, documents à consulter/renvoyer,
  messagerie.

Le projet réutilise la base technique du logiciel de réservation existant (re-skinnable), mais
**pivote** d'une app admin-only vers une app **à deux types d'utilisateurs** (ADMIN + CLIENT).

## Identité visuelle (depuis la V1)

- Palette douce **rose / mauve framboise + crème / doré**, dégradés pastel, petits points
  colorés décoratifs en fond.
- Boutons **rose framboise** ; logo doré « CD soi-même » (Réflexologie • Énergétique • Naturopathie).
- Ton chaleureux et rassurant : « un lieu ressource… prendre rendez-vous avec vous-même… à votre
  rythme, en toute sécurité ».
- Fidélité : **s'inspirer de la V1 et l'améliorer** (garder l'identité, retravailler mise en page
  et composants pour cohérence avec la base technique).

## Architecture en deux portails

- **Page d'accueil publique** : présentation + 4 prestations (Réflexologie, Massage de libération
  émotionnelle, Massage bien-être, Coaching de vie psycho-émotionnel) + deux boutons « Espace
  Praticienne » et « Espace Client ».
- Les deux boutons mènent au **même login** ; après connexion, **redirection par rôle**
  (ADMIN → `/admin`, CLIENT → `/espace`).
- **Clientes sur invitation uniquement** (pas d'inscription publique). Une seule praticienne (Charline).

## Découpage en phases

Le périmètre complet couvre 5 sous-systèmes au-dessus de la base dupliquée. Construction **par
phases**, chacune livrable et testable. Chaque phase aura son propre spec → plan → implémentation.

| Phase | Contenu | Statut |
|-------|---------|--------|
| **1 — Fondation** | Duplication + reskin CDSOIMEME + modèle « prestations/séances » + comptes clientes sur invitation + login + espace cliente affichant ses prochaines séances | **Conçue ici** |
| **2 — Questionnaires** | Charline construit un questionnaire (choix, texte libre…), l'envoie à une cliente, la cliente le remplit, Charline voit les réponses | À concevoir |
| **3 — Documents** | Charline partage des PDF/docs, la cliente consulte/télécharge et peut renvoyer un fichier | À concevoir |
| **4 — Messagerie** | Fil de discussion privé cliente↔Charline + commentaires contextuels (questionnaire / document / séance) | À concevoir |
| **5 — Réservation en ligne** | La cliente demande/réserve un créneau, Charline valide (réutilise dispo/validation existantes) | À concevoir |

---

# Phase 1 — Fondation (conception détaillée)

## Périmètre

Inclus :
1. Duplication du projet dans `CDSOIMEMEV2` (nouveau dépôt git, nouvelle base NeonDB).
2. Reskin CDSOIMEME (identité visuelle douce rose/mauve/doré, page d'accueil deux portails).
3. Adaptation du modèle de données « espaces » → « prestations/séances ».
4. Comptes clientes **sur invitation email** + acceptation / définition du mot de passe + login.
5. Espace cliente sécurisé affichant **ses prochaines séances** (créées par Charline côté admin).

Exclus (phases suivantes) : questionnaires, documents, messagerie, réservation en ligne par la
cliente. Sur le dashboard praticienne, les cartes/actions liées à ces phases (Documents,
Messages, Messagerie, Formulaire) sont affichées **désactivées / « bientôt »**.

## Modèle de données (changements clés)

- **`Resource` → `Prestation`** : `id, slug, name, description, durationMin, priceCents, active,
  sortOrder`. On retire capacité / type d'espace ainsi que `Pricing` / `PricingTier` (tarif simple
  unique suffisant au coaching ; tiers dégressifs supprimés).
- **`User`** : ajout du rôle **`CLIENT`** (en plus de `ADMIN`).
  - Champs cliente : `phone?`, `notes?` (note privée admin).
  - Champs invitation : `inviteToken?` (unique, aléatoire), `inviteTokenExpiresAt?`,
    `inviteSentAt?`, `passwordSetAt?`. `password` reste `null` tant que l'invitation n'est pas
    acceptée.
- **`Reservation` → `RendezVous`** (séance) : `id, clientId → User, prestationId → Prestation,
  startAt, endAt, status (PLANIFIE / CONFIRME / ANNULE / TERMINE), notes, createdAt, updatedAt`.
  Les champs `customerName/email` sont conservés en secours mais une séance est rattachée à une
  cliente via `clientId`.
- **Supprimés en Phase 1** : `ContractTemplate`, `Contract`, `Pricing`, `PricingTier`
  (réintroduits ultérieurement si besoin).
- **`Settings`** : conservé (nom, contact, email d'envoi, adresse) — valeurs CDSOIMEME.

## Authentification & routes

- NextAuth v5 Credentials conservé (JWT, bcrypt). Le rôle est propagé dans la session.
- **Redirection post-login par rôle** : ADMIN → `/admin`, CLIENT → `/espace`.
- Gardes serveur : `requireAdmin()` (existant) pour `/admin/*` ; nouveau **`requireClient()`**
  pour `/espace/*`. Une cliente ne peut accéder qu'à ses propres données.
- Routes :
  - `/` — accueil public (présentation + prestations + deux portails).
  - `/login` — connexion unique (email + mot de passe).
  - `/invitation/[token]` — page publique de définition du mot de passe (acceptation d'invitation).
  - `/espace` — tableau de bord cliente (prochaines séances, message d'accueil ; sections
    Documents/Messagerie en « bientôt »).
  - `/admin` — tableau de bord praticienne (stats Accompagnées / Séances à venir ; cartes
    Documents/Messages en « bientôt » ; actions rapides ; calendrier de la semaine ; prochaines
    séances).
  - `/admin/clientes`, `/admin/clientes/new`, `/admin/clientes/[id]` — gestion des clientes +
    envoi d'invitation.
  - `/admin/prestations*` — gestion des prestations (adapté de la gestion d'espaces existante).
  - `/admin/seances*` (ex-réservations) — création / liste / détail des séances, rattachées à une
    cliente.

## Flux d'invitation cliente

1. Charline crée une fiche cliente (nom + email) dans `/admin/clientes/new`.
2. Le système génère un `inviteToken` aléatoire (expirable, ex. 7 jours) et envoie un **email
   d'invitation Brevo** (simulé en `DEMO_MODE`) contenant le lien `/invitation/[token]`.
3. La cliente ouvre le lien → choisit son mot de passe → `passwordSetAt` rempli, token consommé
   (invalidé).
4. Elle se connecte via `/login` et arrive sur `/espace`.
5. Charline peut renvoyer une invitation (régénère le token) tant que le compte n'est pas activé.

## Reskin CDSOIMEME

- `lib/theme.ts` + `app/globals.css` : palette rose framboise / mauve / crème / doré ; typo
  cohérente avec le ton bienveillant ; `businessName: "CD soi-même"` ; accroche « un lieu
  ressource… à votre rythme, en toute sécurité ». Logo en placeholder à remplacer par le logo doré.
- Page d'accueil refaite (deux portails) ; emails et libellés passés au ton CDSOIMEME.

## Tests (Vitest)

- Génération + consommation (invalidation) du token d'invitation ; refus d'un token expiré /
  déjà utilisé.
- Garde `requireClient` : redirige un non-cliente / non-authentifié.
- Redirection post-login selon le rôle.
- Isolation des données : une cliente ne voit **que ses propres** séances.

## Risques / points d'attention

- **Sécurité multi-rôle** : bien isoler les données par `clientId` côté serveur (jamais se fier au
  client). Vérifier chaque accès `/espace/*`.
- **Régénération du credential NeonDB** : créer une **nouvelle base** pour CDSOIMEMEV2 ; ne pas
  réutiliser le credential exposé du projet resa. Voir mémoire `neon-credential-rotate`.
- **Brevo / emails** : invitation simulée en `DEMO_MODE` ; prévoir clé Brevo + `fromEmail`
  CDSOIMEME avant prod.
- **Migration de données** : nouvelle base, nouveau seed (Charline admin + prestations + quelques
  clientes/séances de démonstration).
