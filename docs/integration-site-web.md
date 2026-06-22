# Intégrer la prise de rendez-vous sur le site cdsoimeme.fr

Trois façons d'ajouter la réservation au site, de la plus simple à la plus personnalisable.
Remplacez `https://APP` par l'URL de déploiement de l'application CD soi-même.

## 1. Lien direct (le plus simple)

Un bouton qui renvoie vers la page de réservation hébergée :

```html
<a href="https://APP/reserver">Prendre rendez-vous</a>
```

## 2. Intégration en iframe (page intégrée au site)

La page `/reserver` est intégrable en iframe (aucune restriction si `ALLOWED_FRAME_ANCESTORS`
n'est pas défini ; sinon y ajouter `cdsoimeme.fr`) :

```html
<iframe
  src="https://APP/reserver"
  style="width:100%;max-width:680px;height:780px;border:0;border-radius:16px"
  title="Prendre rendez-vous — CD soi-même"
></iframe>
```

## 3. API JSON (formulaire 100 % personnalisé)

Pour brancher votre propre formulaire. CORS est ouvert (`Access-Control-Allow-Origin: *`).

### Lister les prestations

```
GET https://APP/api/public/prestations
```

Réponse :

```json
{
  "prestations": [
    { "id": "uuid", "nom": "Réflexologie", "description": "…", "dureeMinutes": 60, "prix": 70 }
  ]
}
```

### Envoyer une demande de rendez-vous

```
POST https://APP/api/public/booking
Content-Type: application/json
```

Corps :

```json
{
  "prenom": "Marie",
  "nom": "Dupont",
  "email": "marie@example.com",
  "telephone": "0600000000",
  "careTypeId": "<id d'une prestation>",
  "requestedDate": "2026-09-15T10:00",
  "notes": "Première séance"
}
```

- `200/201` → `{ "ok": true, "message": "…" }` : la demande est créée au statut **en attente**,
  visible côté praticienne dans **Demandes RDV** pour validation. Si l'email est inconnu, une fiche
  cliente (« prospect ») est créée automatiquement.
- `400` → `{ "error": "…" }` : données invalides (prestation inconnue, date passée, etc.).

### Exemple complet (JS à coller sur le site)

```html
<form id="rdv">
  <input name="prenom" placeholder="Prénom" required />
  <input name="nom" placeholder="Nom" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="telephone" placeholder="Téléphone" />
  <select name="careTypeId" id="prestation" required></select>
  <input name="requestedDate" type="datetime-local" required />
  <textarea name="notes" placeholder="Votre message"></textarea>
  <button type="submit">Demander mon rendez-vous</button>
  <p id="msg"></p>
</form>

<script>
  const API = "https://APP";
  // Remplir la liste des prestations
  fetch(API + "/api/public/prestations")
    .then((r) => r.json())
    .then(({ prestations }) => {
      document.getElementById("prestation").innerHTML = prestations
        .map((p) => `<option value="${p.id}">${p.nom}</option>`)
        .join("");
    });
  // Envoyer la demande
  document.getElementById("rdv").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const res = await fetch(API + "/api/public/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const out = await res.json();
    document.getElementById("msg").textContent = out.message || out.error;
    if (out.ok) e.target.reset();
  });
</script>
```

> Sécurité : l'endpoint crée des demandes **en attente** (jamais de RDV confirmé directement) ;
> rien n'est exposé en lecture sur les données des clientes. Pensez à régénérer le credential Neon
> et à changer les mots de passe de démo avant la mise en production.
