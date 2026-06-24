# Déploiement sur Vercel — CD soi-même

Guide pas à pas pour mettre l'application en production.

## 1. Prérequis

- Le code est sur GitHub : `WeboPoulpe/CDSOIMEMEV22`.
- Un compte Vercel relié à ce dépôt.
- La base NeonDB (existante) et un compte Brevo.

## 2. Importer le projet

1. Vercel → **Add New… → Project** → importer `CDSOIMEMEV22`.
2. Framework détecté : **Next.js**. Laisser les réglages par défaut
   (Build: `next build`, Install: `npm install`). Le script `build` lance déjà
   `prisma generate`.

## 3. Variables d'environnement (Production)

À renseigner dans **Project → Settings → Environment Variables** :

| Variable | Valeur | Notes |
|---|---|---|
| `DATABASE_URL` | URL Neon **pooled** (`-pooler`) | runtime |
| `DIRECT_URL` | URL Neon **directe** | migrations |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | secret |
| `NEXTAUTH_URL` | `https://<ton-domaine>` | URL publique réelle |
| `AUTH_TRUST_HOST` | `true` | |
| `DEMO_MODE` | `false` | **active l'envoi réel des emails** |
| `BREVO_API_KEY` | clé API Brevo | |
| `AUTH_EMAIL_FROM` | `cdsoimeme@gmail.com` | expéditeur + notifs |
| `BLOB_READ_WRITE_TOKEN` | depuis Vercel Blob | upload de documents |
| `TZ` | `Europe/Paris` | créneaux à l'heure locale |
| `ALLOWED_FRAME_ANCESTORS` | (vide) | sauf besoin d'iframe |

> Les variables `BREVO_SMTP_*` ne sont pas indispensables (l'app envoie via l'API Brevo),
> mais peuvent être ajoutées si tu préfères le SMTP.

## 4. Vercel Blob (documents)

1. Vercel → **Storage → Create → Blob**.
2. Copier le `BLOB_READ_WRITE_TOKEN` généré dans les variables d'environnement.
3. Sans ce token, l'upload de documents affiche un message d'erreur clair (le reste fonctionne).

## 5. Brevo (emails)

1. Renseigner `BREVO_API_KEY` + `DEMO_MODE=false`.
2. **Important** : le compte Brevo restreint les IP autorisées. Ajouter l'IP des
   fonctions Vercel dans Brevo (**Sécurité → IP autorisées**, app.brevo.com/security/authorised_ips)
   **ou** désactiver cette restriction — sinon les envois sont refusés.
3. Vérifier/valider l'expéditeur `cdsoimeme@gmail.com` dans Brevo (Senders).

## 6. Domaine

1. Vercel → **Settings → Domains** → ajouter `cdsoimeme.fr` (ou un sous-domaine, ex. `app.cdsoimeme.fr`).
2. Mettre `NEXTAUTH_URL` à cette URL exacte (https).

## 7. Base de données — points RGPD / performance

- **Résidence des données (RGPD)** : la base Neon actuelle est en région **us-east-1 (USA)**.
  Pour des données de santé/bien-être de personnes en France, il est **fortement recommandé de
  migrer la base vers une région UE** (ex. Frankfurt `eu-central-1`) avant la mise en production
  réelle, puis de mettre à jour `DATABASE_URL`/`DIRECT_URL`. Tant que la base est aux USA, la
  politique de confidentialité doit mentionner le transfert hors UE (clauses contractuelles types).
- **Latence** : héberger les fonctions Vercel dans la même zone que la base réduit la latence.
  Si la base reste en us-east, choisir la région Vercel `iad1` ; après migration UE, `cdg1` (Paris).

## 8. Migrations / schéma

Le schéma de production est déjà en place (la base contient toutes les colonnes utilisées).
Le build exécute uniquement `prisma generate` (pas de migration automatique). Pour de futures
évolutions de schéma, utiliser `prisma migrate` avec `DIRECT_URL`.

## 9. Checklist sécurité avant prod

- [ ] Régénérer le **credential NeonDB** (l'actuel a été partagé en clair).
- [ ] Régénérer la **clé Brevo** et le **mot de passe SMTP**.
- [ ] Générer un **`NEXTAUTH_SECRET`** propre.
- [ ] Changer le mot de passe de démo `demo1234` (au minimum pour le compte praticienne) —
      via « Mot de passe oublié » ou en base.
- [ ] `DEMO_MODE=false` + IP Brevo autorisée.
- [ ] Compléter SIRET / adresse dans le profil praticienne (mentions légales).
