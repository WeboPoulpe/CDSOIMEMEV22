# Paiement en ligne (Stripe) — Design

**Date:** 2026-07-07
**Statut:** Validé (brainstorming)

## Objectif

Permettre à une cliente de régler sa séance en ligne, **après** que Charline a
validé sa demande de rendez-vous. Le paiement est **optionnel** (confort) : le
RDV est déjà confirmé quand Charline valide ; le lien de paiement permet
simplement de régler à l'avance. Ne pas payer n'annule pas le RDV.

Portée : **séance seule** (montant = `care_types.prix`). Pas de forfaits, pas
d'acompte, pas de paiement obligatoire dans cette version (YAGNI).

## Approche technique

**Stripe Checkout (redirection hébergée).** Charline valide comme aujourd'hui ;
la cliente reçoit un bouton « Régler ma séance ». Le clic atteint une route
serveur qui crée une **Checkout Session à la volée** (lazy) puis redirige vers
la page de paiement hébergée par Stripe. Un webhook marque le paiement comme réglé.

Choix retenu vs alternatives :
- **vs Stripe Payment Links** : Checkout permet d'attacher la séance/cliente en
  `metadata`, donc le webhook réconcilie automatiquement le paiement au bon RDV.
- **vs Stripe Elements** : Elements ramène la saisie carte dans notre code (plus
  de surface PCI, Stripe.js côté client). Superflu pour un lien optionnel.

Propriété importante : la Checkout Session est générée **au clic** (pas à la
validation), donc le lien **n'expire jamais**. Il fonctionne aussi pour les
prospects non connectés.

Aucune clé publishable côté client n'est nécessaire (Checkout hébergé =
redirection serveur).

## Modèle de données

Nouvelle table `payments` :

| champ | type | note |
|---|---|---|
| `id` | uuid | pk (`gen_random_uuid()`) |
| `cliente_id` | uuid | FK `profiles` |
| `seance_id` | uuid? | FK `seances` (lien best-effort) |
| `token` | text | aléatoire, utilisé dans l'URL publique `/regler/<token>` |
| `amount_cents` | int | capturé depuis `care_types.prix` à la validation |
| `currency` | text | `"eur"` |
| `label` | text | nom de la prestation, affiché sur Stripe |
| `status` | text | `pending` / `paid` / `canceled` |
| `stripe_session_id` | text? | défini à la création de la Checkout Session |
| `stripe_payment_intent` | text? | défini par le webhook |
| `paid_at` | timestamptz? | |
| `created_at` | timestamptz | `now()` |

Index : `token` unique ; index sur `cliente_id` et `seance_id`.

Si `care_types.prix` est nul (prestation personnalisée), aucun `payment` n'est
créé — pas de lien dans l'email.

## Flux

1. **`confirmBookingAction`** (comportement actuel conservé) : crée la séance
   comme aujourd'hui. Si `prix` est défini, crée une ligne `payments`
   (`pending`) et inclut un bouton **« Régler ma séance »** dans l'email de
   confirmation (lien vers `/regler/<token>`).
2. **`/regler/<token>`** (page publique, sans auth) : affiche prestation +
   montant + bouton « Payer ». Une server action crée une Checkout Session
   (`metadata: { paymentId }`, `success_url`/`cancel_url` de retour vers cette
   page) et redirige vers Stripe. Si déjà réglé, affiche un état « déjà payé ».
3. **`/api/webhooks/stripe`** : vérifie la signature (`STRIPE_WEBHOOK_SECRET`).
   Sur `checkout.session.completed`, marque le paiement `paid` + `paid_at` +
   `stripe_payment_intent`. **Idempotent** (ne repasse pas un paiement déjà réglé).
4. **Admin** : badge de paiement (Réglé / En attente / —) sur le détail séance
   et la fiche cliente. Bouton **« Marquer comme réglé »** (paiement espèces /
   en présentiel) et option **« Renvoyer le lien »**.
5. **Espace cliente** : la cliente peut aussi régler depuis son espace (séances
   confirmées non réglées), pas seulement via l'email.

## Structure du code

- `lib/integrations/payments.ts` — sélecteur Simulé vs Stripe réel, calqué sur
  `lib/integrations/email.ts` (gate `STRIPE_SECRET_KEY` + `DEMO_MODE`). Utilise
  le package npm `stripe`.
- `app/regler/[token]/` — page publique + server action de création de session.
- `app/api/webhooks/stripe/route.ts` — endpoint webhook (runtime nodejs, corps
  brut pour la vérification de signature).
- Helpers email : bouton « Régler ma séance » ajouté à
  `bookingConfirmedClientHtml` (ou nouveau template `paymentLinkHtml`).
- Migration Prisma pour la table `payments` (+ `prisma generate`).
- Nouvelles variables d'env : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  (serveur uniquement). Ajoutées à `.env` et `.env.example`.

## Mode démo / simulation

Comme pour l'email : si `DEMO_MODE=true` ou `STRIPE_SECRET_KEY` absente, un
service simulé renvoie une fausse session (URL de succès locale) sans appeler
Stripe. Permet de tester le flux de bout en bout sans clés réelles.

## Gestion des erreurs

- `prix` nul → pas de paiement créé, pas de lien (RDV confirmé quand même).
- Échec création séance (best-effort actuel) → `seance_id` reste nul mais le
  paiement peut tout de même être créé (rattaché à la cliente).
- Webhook : signature invalide → 400 ; événement inconnu → 200 ignoré ;
  paiement déjà `paid` → 200 sans double traitement.
- Clés Stripe absentes en prod → service simulé (log d'avertissement).

## Tests

- Unitaire : sélecteur `payments.ts` (simulé vs réel selon env).
- Unitaire : logique webhook (idempotence, mapping session→payment via metadata).
- Unitaire : `confirmBookingAction` crée un `payment` quand `prix` défini, aucun
  quand `prix` nul.

## Hors périmètre (YAGNI)

- Forfaits payables en ligne.
- Acomptes / paiements partiels.
- Paiement obligatoire / auto-annulation des RDV non payés.
- Remboursements depuis l'app (à faire depuis le dashboard Stripe si besoin).
