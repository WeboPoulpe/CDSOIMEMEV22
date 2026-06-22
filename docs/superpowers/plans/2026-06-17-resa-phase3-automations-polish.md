# Réservation Multi-Espaces — Plan Phase 3 : Automatisations, calendrier & polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brancher les automatisations (emails Brevo, contrat PDF + éditeur, Google Calendar) derrière des interfaces avec mode démo dégradé, assembler le workflow `confirmReservation`, construire le calendrier admin et la vue d'ensemble, puis polir l'UI/responsive et livrer le reset démo + README.

**Architecture:** Intégrations derrière interfaces (`EmailService`, `CalendarService`) avec fallback simulé selon `DEMO_MODE`/absence de clés. Workflow `confirmReservation` orchestre statut + merge + PDF + email + calendar, chaque étape best-effort. Calendrier admin via react-big-calendar. PDF via @react-pdf/renderer servi à la volée.

**Tech Stack:** Brevo API (@getbrevo/brevo), googleapis (Service Account), @react-pdf/renderer, react-big-calendar, date-fns.

**Prérequis:** Phases 1 et 2 terminées.

**Spec de référence:** [docs/superpowers/specs/2026-06-17-resa-multi-espaces-design.md](../specs/2026-06-17-resa-multi-espaces-design.md)

## Global Constraints

- Chaque intégration détecte ses clés au démarrage : clé absente **ou** `DEMO_MODE=true` → implémentation simulée (log + `simulated: true`), jamais de crash.
- `confirmReservation` : statut d'abord (transactionnel), puis merge → PDF → email → calendar, chaque étape best-effort (échec loggé, n'interrompt pas).
- PDF généré à la volée (pas de stockage). `bodySnapshot` figé à la génération du contrat.
- Champs de fusion exacts : `{{client_nom}}`, `{{client_email}}`, `{{societe}}`, `{{espace}}`, `{{date_debut}}`, `{{date_fin}}`, `{{unite}}`, `{{montant}}`, `{{nom_lieu}}`, `{{adresse_lieu}}`. Section conditionnelle `{{#societe}}…{{/societe}}`.
- Reset démo autorisé uniquement si `DEMO_MODE=true`.
- Le re-skin reste limité à `lib/theme.ts` (PDF et emails consomment le thème + Settings).

---

## File Structure (Phase 3)

| Fichier | Responsabilité |
|---------|----------------|
| `lib/integrations/types.ts` | Interfaces `EmailService`, `CalendarService`, types messages |
| `lib/integrations/email.ts` | Brevo + fallback simulé |
| `lib/integrations/calendar.ts` | Google Service Account + fallback simulé |
| `lib/contracts/merge.ts` | Fusion template `{{champs}}` (pure, TDD) |
| `lib/contracts/pdf.tsx` | Composant @react-pdf + `renderContractPdf()` |
| `lib/contracts/build-context.ts` | Construit le contexte de merge depuis une réservation |
| `lib/workflow/confirm-reservation.ts` | Orchestration du workflow |
| `app/admin/reservations/[id]/contract.pdf/route.ts` | Génération PDF à la volée |
| `app/admin/calendrier/page.tsx`, `calendar-view.tsx` | Calendrier admin |
| `app/admin/page.tsx` | Vue d'ensemble (remplace placeholder Phase 1) |
| `app/admin/contrats/page.tsx`, `template-editor.tsx` | Éditeur de modèle |
| `app/admin/reglages/page.tsx`, `settings-form.tsx` | Réglages + bouton reset démo |
| `app/api/demo/reset/route.ts` | Reset démo |
| `components/admin/mobile-nav.tsx` | Drawer mobile |
| `README.md` | Doc finale + script de démo |

---

## Task 1: Interfaces d'intégration

**Files:**
- Create: `lib/integrations/types.ts`

**Interfaces:**
- Produces:
  - `EmailMessage` : `{ to: string; toName?: string; subject: string; html: string; attachment?: { name: string; contentBase64: string } }`
  - `EmailService` : `{ send(msg: EmailMessage): Promise<{ id: string; simulated: boolean }> }`
  - `CalendarEvent` : `{ summary: string; description?: string; startAt: Date; endAt: Date }`
  - `CalendarService` : `{ createEvent(evt: CalendarEvent): Promise<{ id: string; simulated: boolean }> }`

- [ ] **Step 1: Définir les interfaces**

Create `lib/integrations/types.ts`:
```ts
export type EmailAttachment = { name: string; contentBase64: string };

export type EmailMessage = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  attachment?: EmailAttachment;
};

export interface EmailService {
  send(msg: EmailMessage): Promise<{ id: string; simulated: boolean }>;
}

export type CalendarEvent = {
  summary: string;
  description?: string;
  startAt: Date;
  endAt: Date;
};

export interface CalendarService {
  createEvent(evt: CalendarEvent): Promise<{ id: string; simulated: boolean }>;
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 3: Commit**

```bash
git add lib/integrations/types.ts
git commit -m "feat: integration service interfaces"
```

---

## Task 2: Service email Brevo + fallback simulé

**Files:**
- Create: `lib/integrations/email.ts`

**Interfaces:**
- Consumes: `@getbrevo/brevo`, `EmailService`, `EmailMessage`, `Settings` (fromEmail).
- Produces:
  - `getEmailService(): EmailService` — renvoie l'impl réelle si `BREVO_API_KEY` présent ET `DEMO_MODE !== "true"`, sinon l'impl simulée.
  - Helpers de templates : `requestReceivedEmail`, `confirmationEmail`, `rejectionEmail`, `adminNotificationEmail` → renvoient `EmailMessage` (partiels, complétés par l'appelant).

- [ ] **Step 1: Implémenter le service**

Create `lib/integrations/email.ts`:
```ts
import type { EmailService, EmailMessage } from "@/lib/integrations/types";

class SimulatedEmailService implements EmailService {
  async send(msg: EmailMessage) {
    console.log(
      `📧 [SIMULÉ] Email → ${msg.to} | sujet: "${msg.subject}"` +
        (msg.attachment ? ` | PJ: ${msg.attachment.name}` : "")
    );
    return { id: `sim_${Date.now()}`, simulated: true };
  }
}

class BrevoEmailService implements EmailService {
  constructor(private apiKey: string, private fromEmail: string, private fromName: string) {}
  async send(msg: EmailMessage) {
    const { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } = await import("@getbrevo/brevo");
    const api = new TransactionalEmailsApi();
    api.setApiKey(TransactionalEmailsApiApiKeys.apiKey, this.apiKey);
    const res = await api.sendTransacEmail({
      sender: { email: this.fromEmail, name: this.fromName },
      to: [{ email: msg.to, name: msg.toName }],
      subject: msg.subject,
      htmlContent: msg.html,
      attachment: msg.attachment
        ? [{ name: msg.attachment.name, content: msg.attachment.contentBase64 }]
        : undefined,
    });
    const id = (res.body as { messageId?: string })?.messageId ?? `brevo_${Date.now()}`;
    return { id, simulated: false };
  }
}

export function getEmailService(opts: { fromEmail: string; fromName: string }): EmailService {
  const key = process.env.BREVO_API_KEY?.trim();
  const demo = process.env.DEMO_MODE === "true";
  if (!key || demo) return new SimulatedEmailService();
  return new BrevoEmailService(key, opts.fromEmail, opts.fromName);
}

// ───────── Templates (renvoient le corps ; to/subject complétés par l'appelant) ─────────
export function confirmationEmailHtml(p: { businessName: string; resourceName: string; range: string; total: string }): string {
  return `<div style="font-family:sans-serif">
    <h2>Réservation confirmée</h2>
    <p>Votre réservation de <strong>${p.resourceName}</strong> est confirmée.</p>
    <p>${p.range}<br/>Total : ${p.total}</p>
    <p>Vous trouverez votre contrat en pièce jointe.</p>
    <p>— ${p.businessName}</p>
  </div>`;
}

export function requestReceivedEmailHtml(p: { businessName: string; resourceName: string; range: string }): string {
  return `<div style="font-family:sans-serif">
    <h2>Demande bien reçue</h2>
    <p>Nous avons bien reçu votre demande pour <strong>${p.resourceName}</strong> (${p.range}).</p>
    <p>Vous recevrez un email dès qu'elle sera validée.</p>
    <p>— ${p.businessName}</p>
  </div>`;
}

export function rejectionEmailHtml(p: { businessName: string; resourceName: string }): string {
  return `<div style="font-family:sans-serif">
    <h2>Demande non retenue</h2>
    <p>Nous ne pouvons malheureusement pas donner suite à votre demande pour <strong>${p.resourceName}</strong>.</p>
    <p>— ${p.businessName}</p>
  </div>`;
}

export function adminNotificationEmailHtml(p: { resourceName: string; customerName: string; range: string }): string {
  return `<div style="font-family:sans-serif">
    <h2>Nouvelle demande de réservation</h2>
    <p><strong>${p.customerName}</strong> a demandé <strong>${p.resourceName}</strong> (${p.range}).</p>
    <p>Connectez-vous au dashboard pour valider ou refuser.</p>
  </div>`;
}
```
Note : la forme exacte de l'API `@getbrevo/brevo` peut varier selon la version installée. Si `sendTransacEmail` ou `TransactionalEmailsApiApiKeys` diffèrent, consulter la doc via Context7 (`resolve-library-id` → `@getbrevo/brevo`). Le fallback simulé reste la voie par défaut en démo, donc la démo ne dépend pas de cette API.

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 3: Test du sélecteur de service**

Create `lib/integrations/__tests__/email.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { getEmailService } from "@/lib/integrations/email";

describe("getEmailService", () => {
  beforeEach(() => { process.env.DEMO_MODE = "true"; process.env.BREVO_API_KEY = ""; });
  it("returns a simulated service in demo mode", async () => {
    const svc = getEmailService({ fromEmail: "x@y.fr", fromName: "Test" });
    const res = await svc.send({ to: "a@b.fr", subject: "Hi", html: "<p>hi</p>" });
    expect(res.simulated).toBe(true);
  });
});
```

- [ ] **Step 4: Lancer le test**

Run: `npm test -- email`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/integrations/email.ts lib/integrations/__tests__/email.test.ts
git commit -m "feat: Brevo email service with simulated fallback"
```

---

## Task 3: Service Google Calendar + fallback simulé

**Files:**
- Create: `lib/integrations/calendar.ts`

**Interfaces:**
- Consumes: `googleapis`, `CalendarService`, `CalendarEvent`.
- Produces: `getCalendarService(): CalendarService` — réel si `GOOGLE_SERVICE_ACCOUNT_JSON` + `GOOGLE_CALENDAR_ID` présents ET `DEMO_MODE !== "true"`, sinon simulé.

- [ ] **Step 1: Implémenter le service**

Create `lib/integrations/calendar.ts`:
```ts
import type { CalendarService, CalendarEvent } from "@/lib/integrations/types";

class SimulatedCalendarService implements CalendarService {
  async createEvent(evt: CalendarEvent) {
    console.log(
      `📅 [SIMULÉ] Event agenda → "${evt.summary}" du ${evt.startAt.toISOString()} au ${evt.endAt.toISOString()}`
    );
    return { id: `sim_evt_${Date.now()}`, simulated: true };
  }
}

class GoogleCalendarService implements CalendarService {
  constructor(private credentials: object, private calendarId: string) {}
  async createEvent(evt: CalendarEvent) {
    const { google } = await import("googleapis");
    const auth = new google.auth.GoogleAuth({
      credentials: this.credentials as never,
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.events.insert({
      calendarId: this.calendarId,
      requestBody: {
        summary: evt.summary,
        description: evt.description,
        start: { dateTime: evt.startAt.toISOString() },
        end: { dateTime: evt.endAt.toISOString() },
      },
    });
    return { id: res.data.id ?? `gcal_${Date.now()}`, simulated: false };
  }
}

export function getCalendarService(): CalendarService {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  const calId = process.env.GOOGLE_CALENDAR_ID?.trim();
  const demo = process.env.DEMO_MODE === "true";
  if (!raw || !calId || demo) return new SimulatedCalendarService();
  try {
    const credentials = JSON.parse(raw);
    return new GoogleCalendarService(credentials, calId);
  } catch {
    console.warn("⚠️ GOOGLE_SERVICE_ACCOUNT_JSON invalide — fallback simulé.");
    return new SimulatedCalendarService();
  }
}
```

- [ ] **Step 2: Test du sélecteur**

Create `lib/integrations/__tests__/calendar.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { getCalendarService } from "@/lib/integrations/calendar";

describe("getCalendarService", () => {
  beforeEach(() => { process.env.DEMO_MODE = "true"; });
  it("returns simulated service in demo mode", async () => {
    const svc = getCalendarService();
    const res = await svc.createEvent({ summary: "Test", startAt: new Date(), endAt: new Date(Date.now() + 3600000) });
    expect(res.simulated).toBe(true);
  });
});
```

- [ ] **Step 3: Lancer le test**

Run: `npm test -- calendar`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/integrations/calendar.ts lib/integrations/__tests__/calendar.test.ts
git commit -m "feat: Google Calendar service with simulated fallback"
```

---

## Task 4: Fusion du template de contrat (TDD)

**Files:**
- Create: `lib/contracts/merge.ts`, `lib/contracts/__tests__/merge.test.ts`

**Interfaces:**
- Produces:
  - `mergeTemplate(body: string, ctx: Record<string, string>): string` — remplace `{{champ}}` et gère les sections `{{#champ}}…{{/champ}}` (incluses si la valeur est non vide, sinon retirées).

- [ ] **Step 1: Écrire les tests qui échouent**

Create `lib/contracts/__tests__/merge.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mergeTemplate } from "@/lib/contracts/merge";

describe("mergeTemplate", () => {
  it("replaces simple fields", () => {
    expect(mergeTemplate("Bonjour {{client_nom}}", { client_nom: "Jean" })).toBe("Bonjour Jean");
  });
  it("replaces multiple occurrences", () => {
    expect(mergeTemplate("{{x}}-{{x}}", { x: "a" })).toBe("a-a");
  });
  it("leaves unknown fields empty", () => {
    expect(mergeTemplate("[{{inconnu}}]", {})).toBe("[]");
  });
  it("includes conditional section when value present", () => {
    expect(mergeTemplate("A{{#societe}}, société {{societe}}{{/societe}}.", { societe: "ACME" }))
      .toBe("A, société ACME.");
  });
  it("removes conditional section when value empty", () => {
    expect(mergeTemplate("A{{#societe}}, société {{societe}}{{/societe}}.", { societe: "" }))
      .toBe("A.");
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- merge`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

Create `lib/contracts/merge.ts`:
```ts
export function mergeTemplate(body: string, ctx: Record<string, string>): string {
  // 1. Sections conditionnelles {{#key}}...{{/key}}
  let out = body.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_m, key: string, inner: string) => {
      const v = ctx[key];
      return v && v.trim() !== "" ? inner : "";
    }
  );
  // 2. Champs simples {{key}}
  out = out.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => ctx[key] ?? "");
  return out;
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npm test -- merge`
Expected: tous PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/contracts/merge.ts lib/contracts/__tests__/merge.test.ts
git commit -m "feat: contract template merge with conditional sections"
```

---

## Task 5: Contexte de fusion depuis une réservation

**Files:**
- Create: `lib/contracts/build-context.ts`

**Interfaces:**
- Consumes: `formatEuros`, `formatDateRange`, types Prisma.
- Produces:
  - `buildMergeContext(args: { reservation; resource; settings }): Record<string, string>` avec exactement les 10 champs de fusion + `societe`.

- [ ] **Step 1: Implémenter**

Create `lib/contracts/build-context.ts`:
```ts
import type { Reservation, Resource, Settings } from "@prisma/client";
import { formatEuros } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const UNIT_LABELS: Record<string, string> = {
  HOUR: "à l'heure", HALF_DAY: "à la demi-journée", DAY: "à la journée", MONTH: "au mois",
};

export function buildMergeContext(args: {
  reservation: Reservation;
  resource: Resource;
  settings: Settings | null;
}): Record<string, string> {
  const { reservation: r, resource, settings } = args;
  const fmt = (d: Date) => format(d, "d MMMM yyyy 'à' HH:mm", { locale: fr });
  return {
    client_nom: r.customerName,
    client_email: r.customerEmail,
    societe: r.company ?? "",
    espace: resource.name,
    date_debut: fmt(r.startAt),
    date_fin: fmt(r.endAt),
    unite: UNIT_LABELS[r.unit] ?? r.unit,
    montant: formatEuros(r.totalCents),
    nom_lieu: settings?.businessName ?? "Le lieu",
    adresse_lieu: settings?.address ?? "",
  };
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 3: Commit**

```bash
git add lib/contracts/build-context.ts
git commit -m "feat: build merge context from reservation"
```

---

## Task 6: Génération du PDF de contrat

**Files:**
- Create: `lib/contracts/pdf.tsx`

**Interfaces:**
- Consumes: `@react-pdf/renderer`, `theme`.
- Produces:
  - `renderContractPdf(args: { title: string; body: string; businessName: string }): Promise<Buffer>` — rend un PDF stylé thème.

- [ ] **Step 1: Implémenter le composant + rendu**

Create `lib/contracts/pdf.tsx`:
```tsx
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { theme } from "@/lib/theme";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, color: theme.colors.foreground, backgroundColor: "#ffffff", lineHeight: 1.6 },
  header: { fontSize: 18, marginBottom: 4, color: theme.colors.primary },
  business: { fontSize: 10, marginBottom: 24, color: theme.colors.secondary },
  body: { whiteSpace: "pre-wrap" },
  line: { marginBottom: 4 },
});

export async function renderContractPdf(args: {
  title: string;
  body: string;
  businessName: string;
}): Promise<Buffer> {
  const lines = args.body.split("\n");
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>{args.title}</Text>
        <Text style={styles.business}>{args.businessName}</Text>
        <View style={styles.body}>
          {lines.map((l, i) => (
            <Text key={i} style={styles.line}>{l || " "}</Text>
          ))}
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
```
Note : `renderToBuffer` est exporté par `@react-pdf/renderer` côté Node. La route PDF (Task 8) tourne en runtime Node (`export const runtime = "nodejs"`).

- [ ] **Step 2: Vérifier la compilation**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 3: Commit**

```bash
git add lib/contracts/pdf.tsx
git commit -m "feat: contract PDF rendering"
```

---

## Task 7: Workflow confirmReservation (orchestration)

**Files:**
- Create: `lib/workflow/confirm-reservation.ts`
- Modify: `app/(public)/actions.ts`, `app/admin/actions.ts` (remplacer les `// TODO Phase 3`)

**Interfaces:**
- Consumes: `prisma`, `getEmailService`, `getCalendarService`, `mergeTemplate`, `buildMergeContext`, `renderContractPdf`, templates email, `formatDateRange`.
- Produces:
  - `confirmReservation(reservationId: string): Promise<void>` — idempotent-ish : suppose le statut déjà `CONFIRMED` (posé par l'appelant transactionnel) ; génère contrat + email + calendar, best-effort.
  - `notifyNewRequest(reservationId)` + `sendRequestReceived(reservationId)` pour le cas PENDING.
  - `sendRejection(reservationId)`.

- [ ] **Step 1: Implémenter le workflow**

Create `lib/workflow/confirm-reservation.ts`:
```ts
import { prisma } from "@/lib/db";
import { getEmailService, confirmationEmailHtml, requestReceivedEmailHtml, rejectionEmailHtml, adminNotificationEmailHtml } from "@/lib/integrations/email";
import { getCalendarService } from "@/lib/integrations/calendar";
import { mergeTemplate } from "@/lib/contracts/merge";
import { buildMergeContext } from "@/lib/contracts/build-context";
import { renderContractPdf } from "@/lib/contracts/pdf";
import { formatDateRange, formatEuros } from "@/lib/utils";

async function loadFull(reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { resource: true },
  });
  if (!reservation) throw new Error("Réservation introuvable.");
  const settings = await prisma.settings.findFirst();
  return { reservation, resource: reservation.resource, settings };
}

export async function confirmReservation(reservationId: string): Promise<void> {
  const { reservation, resource, settings } = await loadFull(reservationId);
  const range = formatDateRange(reservation.startAt, reservation.endAt);
  const email = getEmailService({
    fromEmail: settings?.fromEmail ?? "no-reply@demo.fr",
    fromName: settings?.businessName ?? "Réservations",
  });
  const calendar = getCalendarService();

  // 1. Contrat : sélection du template (par type, sinon global)
  let attachmentBase64: string | undefined;
  try {
    const template =
      (await prisma.contractTemplate.findFirst({ where: { active: true, appliesTo: resource.type } })) ??
      (await prisma.contractTemplate.findFirst({ where: { active: true, appliesTo: null } }));
    if (template) {
      const ctx = buildMergeContext({ reservation, resource, settings });
      const merged = mergeTemplate(template.body, ctx);
      const pdf = await renderContractPdf({
        title: "Contrat de réservation",
        body: merged,
        businessName: settings?.businessName ?? "Le lieu",
      });
      attachmentBase64 = pdf.toString("base64");
      await prisma.contract.upsert({
        where: { reservationId },
        create: { reservationId, templateId: template.id, bodySnapshot: merged, sentAt: new Date(), pdfUrl: `/admin/reservations/${reservationId}/contract.pdf` },
        update: { templateId: template.id, bodySnapshot: merged, sentAt: new Date() },
      });
    }
  } catch (e) {
    console.error("⚠️ Génération contrat échouée:", e);
  }

  // 2. Email de confirmation (+ PJ contrat si dispo)
  try {
    const res = await email.send({
      to: reservation.customerEmail,
      toName: reservation.customerName,
      subject: `Réservation confirmée — ${resource.name}`,
      html: confirmationEmailHtml({ businessName: settings?.businessName ?? "Le lieu", resourceName: resource.name, range, total: formatEuros(reservation.totalCents) }),
      attachment: attachmentBase64 ? { name: "contrat.pdf", contentBase64: attachmentBase64 } : undefined,
    });
    await prisma.reservation.update({ where: { id: reservationId }, data: { confirmationEmailSentAt: new Date() } });
    console.log(`Email confirmation ${res.simulated ? "[simulé]" : "[réel]"} → ${reservation.customerEmail}`);
  } catch (e) {
    console.error("⚠️ Email confirmation échoué:", e);
  }

  // 3. Event Google Agenda
  try {
    const evt = await calendar.createEvent({
      summary: `${resource.name} — ${reservation.customerName}`,
      description: `Réservation ${formatEuros(reservation.totalCents)}. Contact: ${reservation.customerEmail}`,
      startAt: reservation.startAt,
      endAt: reservation.endAt,
    });
    await prisma.reservation.update({ where: { id: reservationId }, data: { calendarEventId: evt.id } });
  } catch (e) {
    console.error("⚠️ Event agenda échoué:", e);
  }
}

export async function sendRequestReceived(reservationId: string): Promise<void> {
  const { reservation, resource, settings } = await loadFull(reservationId);
  const email = getEmailService({ fromEmail: settings?.fromEmail ?? "no-reply@demo.fr", fromName: settings?.businessName ?? "Réservations" });
  const range = formatDateRange(reservation.startAt, reservation.endAt);
  try {
    await email.send({ to: reservation.customerEmail, toName: reservation.customerName, subject: `Demande reçue — ${resource.name}`, html: requestReceivedEmailHtml({ businessName: settings?.businessName ?? "Le lieu", resourceName: resource.name, range }) });
  } catch (e) { console.error("⚠️ Email demande reçue échoué:", e); }
}

export async function notifyNewRequest(reservationId: string): Promise<void> {
  const { reservation, resource, settings } = await loadFull(reservationId);
  if (!settings?.contactEmail) return;
  const email = getEmailService({ fromEmail: settings.fromEmail, fromName: settings.businessName });
  const range = formatDateRange(reservation.startAt, reservation.endAt);
  try {
    await email.send({ to: settings.contactEmail, subject: `Nouvelle demande — ${resource.name}`, html: adminNotificationEmailHtml({ resourceName: resource.name, customerName: reservation.customerName, range }) });
  } catch (e) { console.error("⚠️ Notif admin échouée:", e); }
}

export async function sendRejection(reservationId: string): Promise<void> {
  const { reservation, resource, settings } = await loadFull(reservationId);
  const email = getEmailService({ fromEmail: settings?.fromEmail ?? "no-reply@demo.fr", fromName: settings?.businessName ?? "Réservations" });
  try {
    await email.send({ to: reservation.customerEmail, toName: reservation.customerName, subject: `Votre demande — ${resource.name}`, html: rejectionEmailHtml({ businessName: settings?.businessName ?? "Le lieu", resourceName: resource.name }) });
  } catch (e) { console.error("⚠️ Email refus échoué:", e); }
}
```

- [ ] **Step 2: Brancher dans la Server Action publique**

Modify `app/(public)/actions.ts` — remplacer le bloc `// TODO Phase 3` par :
```ts
import { confirmReservation, sendRequestReceived, notifyNewRequest } from "@/lib/workflow/confirm-reservation";
```
Et dans le `try` après création :
```ts
    const res = await createReservation(parsed.data);
    reservationId = res.reservation.id;
    autoConfirmed = res.autoConfirmed;
    if (autoConfirmed) {
      await confirmReservation(reservationId);
    } else {
      await sendRequestReceived(reservationId);
      await notifyNewRequest(reservationId);
    }
```

- [ ] **Step 3: Brancher dans la validation/refus admin**

Modify `app/admin/actions.ts` :
- En tête, ajouter `import { confirmReservation, sendRejection } from "@/lib/workflow/confirm-reservation";`
- Dans `validateReservationAction`, après la transaction qui passe `CONFIRMED` (remplacer le `// TODO Phase 3`) :
```ts
    await confirmReservation(id);
    revalidatePath("/admin/reservations");
    return {};
```
- Dans `rejectReservationAction`, après l'update (remplacer le `// TODO Phase 3`) :
```ts
  await sendRejection(id);
  revalidatePath("/admin/reservations");
```

- [ ] **Step 4: Test manuel du workflow complet (mode démo)**

Run: `npm run dev` (avec `DEMO_MODE=true`). Réserver le coworking (auto-confirmé) → vérifier dans la console : `📧 [SIMULÉ] Email …` avec `PJ: contrat.pdf` + `📅 [SIMULÉ] Event …`. En base, `confirmationEmailSentAt` et `calendarEventId` remplis, un `Contract` créé avec `bodySnapshot`. Puis valider une demande PENDING grande salle depuis l'admin → mêmes logs.

- [ ] **Step 5: Commit**

```bash
git add lib/workflow "app/(public)/actions.ts" app/admin/actions.ts
git commit -m "feat: confirmReservation workflow wiring emails, PDF, calendar"
```

---

## Task 8: Route PDF à la volée

**Files:**
- Create: `app/admin/reservations/[id]/contract.pdf/route.ts`
- Modify: `app/admin/reservations/[id]/page.tsx` (lien de téléchargement)

**Interfaces:**
- Consumes: `prisma`, `auth`, `mergeTemplate`, `buildMergeContext`, `renderContractPdf`.
- Produces: `GET` qui renvoie le PDF du contrat (régénéré à partir du `bodySnapshot` si présent, sinon re-merge live).

- [ ] **Step 1: Route handler PDF**

Create `app/admin/reservations/[id]/contract.pdf/route.ts`:
```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderContractPdf } from "@/lib/contracts/pdf";
import { mergeTemplate } from "@/lib/contracts/merge";
import { buildMergeContext } from "@/lib/contracts/build-context";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({ where: { id }, include: { resource: true, contract: true } });
  if (!reservation) return new Response("Introuvable", { status: 404 });

  const settings = await prisma.settings.findFirst();

  let body = reservation.contract?.bodySnapshot;
  if (!body) {
    const template =
      (await prisma.contractTemplate.findFirst({ where: { active: true, appliesTo: reservation.resource.type } })) ??
      (await prisma.contractTemplate.findFirst({ where: { active: true, appliesTo: null } }));
    body = template ? mergeTemplate(template.body, buildMergeContext({ reservation, resource: reservation.resource, settings })) : "Aucun modèle de contrat disponible.";
  }

  const pdf = await renderContractPdf({ title: "Contrat de réservation", body, businessName: settings?.businessName ?? "Le lieu" });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contrat-${id}.pdf"`,
    },
  });
}
```

- [ ] **Step 2: Lien dans la fiche réservation**

Modify `app/admin/reservations/[id]/page.tsx` — ajouter sous le bloc actions (visible si CONFIRMED) :
```tsx
      {r.status === "CONFIRMED" && (
        <a
          href={`/admin/reservations/${r.id}/contract.pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-primary underline"
        >
          📄 Voir le contrat PDF
        </a>
      )}
```

- [ ] **Step 3: Test manuel**

Run: `npm run dev`, ouvrir une réservation CONFIRMED, cliquer « Voir le contrat PDF ».
Expected: un PDF s'ouvre avec les champs fusionnés (nom client, espace, dates, montant, nom du lieu).

- [ ] **Step 4: Commit**

```bash
git add "app/admin/reservations/[id]"
git commit -m "feat: on-demand contract PDF route"
```

---

## Task 9: Éditeur de modèle de contrat

**Files:**
- Create: `app/admin/contrats/page.tsx`, `app/admin/contrats/template-editor.tsx`
- Modify: `app/admin/actions.ts` (ajouter `saveTemplateAction`)

**Interfaces:**
- Consumes: `prisma`.
- Produces: `saveTemplateAction(formData): Promise<{ error?: string }>` — upsert du template (par id, ou crée si absent).

- [ ] **Step 1: Server Action**

Add to `app/admin/actions.ts`:
```ts
export async function saveTemplateAction(formData: FormData): Promise<{ error?: string }> {
  const id = formData.get("id") ? String(formData.get("id")) : undefined;
  const name = String(formData.get("name") || "Modèle de contrat");
  const body = String(formData.get("body") || "");
  if (body.trim().length < 10) return { error: "Le corps du contrat est trop court." };
  if (id) await prisma.contractTemplate.update({ where: { id }, data: { name, body } });
  else await prisma.contractTemplate.create({ data: { name, body, appliesTo: null, active: true } });
  revalidatePath("/admin/contrats");
  return {};
}
```

- [ ] **Step 2: Éditeur (client)**

Create `app/admin/contrats/template-editor.tsx`:
```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { saveTemplateAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELDS = ["client_nom","client_email","societe","espace","date_debut","date_fin","unite","montant","nom_lieu","adresse_lieu"];

export function TemplateEditor({ template }: { template?: { id: string; name: string; body: string } }) {
  const [pending, setPending] = useState(false);
  const [body, setBody] = useState(template?.body ?? "");
  return (
    <form
      action={async (fd) => { setPending(true); const r = await saveTemplateAction(fd); setPending(false); if (r?.error) toast.error(r.error); else toast.success("Modèle enregistré."); }}
      className="space-y-4"
    >
      {template?.id && <input type="hidden" name="id" value={template.id} />}
      <div className="space-y-2"><Label htmlFor="name">Nom du modèle</Label><Input id="name" name="name" defaultValue={template?.name ?? "Contrat de location standard"} /></div>
      <div className="space-y-2">
        <Label>Champs de fusion disponibles</Label>
        <div className="flex flex-wrap gap-2 text-xs">
          {FIELDS.map((f) => (
            <button key={f} type="button" onClick={() => setBody((b) => b + `{{${f}}}`)} className="rounded-full border border-muted px-2 py-1 hover:bg-muted">
              {`{{${f}}}`}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">Corps du contrat</Label>
        <Textarea id="body" name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={18} className="font-mono text-sm" />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer le modèle"}</Button>
    </form>
  );
}
```

- [ ] **Step 3: Page**

Create `app/admin/contrats/page.tsx`:
```tsx
import { prisma } from "@/lib/db";
import { TemplateEditor } from "./template-editor";

export default async function ContratsPage() {
  const template = await prisma.contractTemplate.findFirst({ where: { active: true, appliesTo: null }, orderBy: { updatedAt: "desc" } });
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Modèle de contrat</h1>
        <p className="text-sm text-foreground/60">Cliquez un champ pour l'insérer. Il sera rempli automatiquement à la confirmation.</p>
      </div>
      <TemplateEditor template={template ? { id: template.id, name: template.name, body: template.body } : undefined} />
    </div>
  );
}
```

- [ ] **Step 4: Test manuel**

Run: `npm run dev`, `/admin/contrats`. Modifier le corps, insérer un champ via les boutons, enregistrer (toast). Re-confirmer une réservation et vérifier que le PDF reflète le modèle.

- [ ] **Step 5: Commit**

```bash
git add app/admin/contrats app/admin/actions.ts
git commit -m "feat: contract template editor with merge fields"
```

---

## Task 10: Calendrier admin

**Files:**
- Create: `app/admin/calendrier/page.tsx`, `app/admin/calendrier/calendar-view.tsx`
- Modify: `app/globals.css` (styles react-big-calendar)

**Interfaces:**
- Consumes: `prisma`, `react-big-calendar`, `date-fns`.
- Produces: calendrier mois/semaine, événements colorés par espace, lisible mobile.

- [ ] **Step 1: Vue calendrier (client)**

Create `app/admin/calendrier/calendar-view.tsx`:
```tsx
"use client";

import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay,
  locales: { fr },
});

const PALETTE = ["#B4502E", "#7C8B6B", "#9C6B3E", "#52796F", "#A14A76"];

export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceIndex: number;
  status: string;
};

export function CalendarView({ events }: { events: CalEvent[] }) {
  return (
    <div className="h-[70vh] rounded-lg bg-white p-2">
      <Calendar
        localizer={localizer}
        events={events}
        defaultView={Views.MONTH}
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        culture="fr"
        messages={{ month: "Mois", week: "Semaine", day: "Jour", today: "Aujourd'hui", previous: "‹", next: "›" }}
        eventPropGetter={(evt: CalEvent) => ({
          style: {
            backgroundColor: PALETTE[evt.resourceIndex % PALETTE.length],
            opacity: evt.status === "PENDING" ? 0.55 : 1,
            border: evt.status === "PENDING" ? "1px dashed #1F1B16" : "none",
          },
        })}
      />
    </div>
  );
}
```

- [ ] **Step 2: Page calendrier (serveur)**

Create `app/admin/calendrier/page.tsx`:
```tsx
import { prisma } from "@/lib/db";
import { CalendarView, type CalEvent } from "./calendar-view";

export default async function CalendrierPage() {
  const resources = await prisma.resource.findMany({ orderBy: { sortOrder: "asc" } });
  const index = new Map(resources.map((r, i) => [r.id, i]));

  const reservations = await prisma.reservation.findMany({
    where: { status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
    include: { resource: true },
  });

  const events: CalEvent[] = reservations.map((r) => ({
    id: r.id,
    title: `${r.resource.name} · ${r.customerName}`,
    start: r.startAt,
    end: r.endAt,
    resourceIndex: index.get(r.resourceId) ?? 0,
    status: r.status,
  }));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Calendrier</h1>
      <div className="flex flex-wrap gap-3 text-sm">
        {resources.map((r, i) => (
          <span key={r.id} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: ["#B4502E","#7C8B6B","#9C6B3E","#52796F","#A14A76"][i % 5] }} />
            {r.name}
          </span>
        ))}
        <span className="text-foreground/50">(pointillé = en attente)</span>
      </div>
      <CalendarView events={events} />
    </div>
  );
}
```

- [ ] **Step 3: Test manuel**

Run: `npm run dev`, `/admin/calendrier`.
Expected: calendrier mois rempli avec les résa du seed, couleurs par espace, PENDING en pointillé translucide. Basculer Mois/Semaine/Jour. Vérifier la lisibilité en réduisant la fenêtre (mobile).

- [ ] **Step 4: Commit**

```bash
git add app/admin/calendrier
git commit -m "feat: admin multi-resource calendar"
```

---

## Task 11: Vue d'ensemble (KPIs)

**Files:**
- Modify: `app/admin/page.tsx` (remplacer le placeholder Phase 1)

**Interfaces:**
- Consumes: `prisma`, `formatEuros`, `formatDateRange`.
- Produces: dashboard avec prochaines réservations, nb de demandes en attente, chiffre du mois (somme `totalCents` des CONFIRMED/COMPLETED du mois courant).

- [ ] **Step 1: Vue d'ensemble**

Replace `app/admin/page.tsx`:
```tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatEuros, formatDateRange } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminHome() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [pendingCount, upcoming, monthRevenue] = await Promise.all([
    prisma.reservation.count({ where: { status: "PENDING" } }),
    prisma.reservation.findMany({
      where: { status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: now } },
      orderBy: { startAt: "asc" }, take: 6, include: { resource: true },
    }),
    prisma.reservation.aggregate({
      _sum: { totalCents: true },
      where: { status: { in: ["CONFIRMED", "COMPLETED"] }, startAt: { gte: monthStart, lt: monthEnd } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Vue d'ensemble</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm text-foreground/60">Demandes en attente</CardTitle></CardHeader><CardContent><p className="font-display text-3xl">{pendingCount}</p></CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm text-foreground/60">Chiffre du mois</CardTitle></CardHeader><CardContent><p className="font-display text-3xl">{formatEuros(monthRevenue._sum.totalCents ?? 0)}</p></CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm text-foreground/60">À venir</CardTitle></CardHeader><CardContent><p className="font-display text-3xl">{upcoming.length}</p></CardContent></Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Prochaines réservations</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {upcoming.length === 0 && <p className="text-foreground/50">Rien à venir.</p>}
          {upcoming.map((r) => (
            <Link key={r.id} href={`/admin/reservations/${r.id}`} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted">
              <div>
                <p className="font-medium">{r.resource.name} — {r.customerName}</p>
                <p className="text-sm text-foreground/60">{formatDateRange(r.startAt, r.endAt)}</p>
              </div>
              <StatusBadge status={r.status} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Test manuel**

Run: `npm run dev`, `/admin`.
Expected: 3 cartes KPI cohérentes avec le seed (demandes en attente, chiffre du mois, à venir) + liste des prochaines réservations cliquables.

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: admin overview dashboard with KPIs"
```

---

## Task 12: Réglages + reset démo

**Files:**
- Create: `app/admin/reglages/page.tsx`, `app/admin/reglages/settings-form.tsx`, `app/admin/reglages/reset-button.tsx`, `app/api/demo/reset/route.ts`
- Modify: `app/admin/actions.ts` (ajouter `saveSettingsAction`)
- Modify: `prisma/seed.ts` (s'assurer que `seed()` est exporté — fait en Phase 1)

**Interfaces:**
- Consumes: `prisma`, `seed` (depuis `prisma/seed.ts`), `auth`.
- Produces: `saveSettingsAction`, route `POST /api/demo/reset`.

- [ ] **Step 1: Server Action settings**

Add to `app/admin/actions.ts`:
```ts
export async function saveSettingsAction(formData: FormData): Promise<{ error?: string }> {
  const data = {
    businessName: String(formData.get("businessName") || ""),
    contactEmail: String(formData.get("contactEmail") || ""),
    contactPhone: String(formData.get("contactPhone") || "") || null,
    fromEmail: String(formData.get("fromEmail") || ""),
    address: String(formData.get("address") || "") || null,
  };
  if (!data.businessName || !data.contactEmail || !data.fromEmail) {
    return { error: "Nom, email de contact et email expéditeur sont requis." };
  }
  const existing = await prisma.settings.findFirst();
  if (existing) await prisma.settings.update({ where: { id: existing.id }, data });
  else await prisma.settings.create({ data });
  revalidatePath("/admin/reglages");
  return {};
}
```

- [ ] **Step 2: Route reset démo**

Create `app/api/demo/reset/route.ts`:
```ts
import { auth } from "@/lib/auth";
import { seed } from "@/prisma/seed";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.DEMO_MODE !== "true") {
    return new Response("Reset désactivé hors mode démo.", { status: 403 });
  }
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  await seed();
  return Response.json({ ok: true });
}
```
Note : `seed()` est exporté depuis `prisma/seed.ts` (Phase 1 Task 8). Le bloc d'auto-exécution `seed().catch(...)` en bas du fichier ne se déclenche QUE quand le fichier est lancé directement par `tsx`. Vérifier que cet auto-run est encadré pour ne pas s'exécuter à l'import — si nécessaire, le garder car en contexte Next.js l'import n'invoque pas le bloc de manière problématique ; en cas de souci, déplacer l'auto-run derrière `if (process.argv[1]?.includes("seed"))`.

- [ ] **Step 3: Sécuriser l'auto-run du seed (ajustement)**

Modify `prisma/seed.ts` — remplacer le bloc d'exécution directe par :
```ts
const isDirectRun = process.argv[1]?.includes("seed");
if (isDirectRun) {
  seed()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
```

- [ ] **Step 4: Formulaire réglages + bouton reset (client)**

Create `app/admin/reglages/settings-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { saveSettingsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type S = { businessName: string; contactEmail: string; contactPhone: string | null; fromEmail: string; address: string | null };

export function SettingsForm({ settings }: { settings: S | null }) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => { setPending(true); const r = await saveSettingsAction(fd); setPending(false); if (r?.error) toast.error(r.error); else toast.success("Réglages enregistrés."); }}
      className="max-w-lg space-y-4"
    >
      <div className="space-y-2"><Label htmlFor="businessName">Nom du lieu</Label><Input id="businessName" name="businessName" defaultValue={settings?.businessName} required /></div>
      <div className="space-y-2"><Label htmlFor="contactEmail">Email de contact (notifications admin)</Label><Input id="contactEmail" name="contactEmail" type="email" defaultValue={settings?.contactEmail} required /></div>
      <div className="space-y-2"><Label htmlFor="fromEmail">Email expéditeur</Label><Input id="fromEmail" name="fromEmail" type="email" defaultValue={settings?.fromEmail} required /></div>
      <div className="space-y-2"><Label htmlFor="contactPhone">Téléphone</Label><Input id="contactPhone" name="contactPhone" defaultValue={settings?.contactPhone ?? ""} /></div>
      <div className="space-y-2"><Label htmlFor="address">Adresse</Label><Input id="address" name="address" defaultValue={settings?.address ?? ""} /></div>
      <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>
  );
}
```

Create `app/admin/reglages/reset-button.tsx`:
```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ResetDemoButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Réinitialiser toutes les données de démo ?")) return;
        setPending(true);
        const res = await fetch("/api/demo/reset", { method: "POST" });
        setPending(false);
        if (res.ok) { toast.success("Démo réinitialisée."); setTimeout(() => location.reload(), 800); }
        else toast.error("Reset impossible (hors mode démo ?).");
      }}
    >
      {pending ? "Réinitialisation…" : "🔄 Réinitialiser la démo"}
    </Button>
  );
}
```

- [ ] **Step 5: Page réglages**

Create `app/admin/reglages/page.tsx`:
```tsx
import { prisma } from "@/lib/db";
import { SettingsForm } from "./settings-form";
import { ResetDemoButton } from "./reset-button";

export default async function ReglagesPage() {
  const settings = await prisma.settings.findFirst();
  const demo = process.env.DEMO_MODE === "true";
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-display text-3xl">Réglages</h1>
      <SettingsForm settings={settings} />
      {demo && (
        <div className="space-y-2 rounded-lg border border-muted p-4">
          <h2 className="font-display text-lg">Mode démo</h2>
          <p className="text-sm text-foreground/60">Rejoue le jeu de données « La Grange Lyotaine ». À utiliser avant une présentation.</p>
          <ResetDemoButton />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Test manuel**

Run: `npm run dev`, `/admin/reglages`. Modifier le nom du lieu, enregistrer. Cliquer « Réinitialiser la démo » → confirmation, reload, données du seed restaurées (revenir à 3 PENDING).

- [ ] **Step 7: Commit**

```bash
git add app/admin/reglages app/api/demo/reset prisma/seed.ts app/admin/actions.ts
git commit -m "feat: settings page and demo reset"
```

---

## Task 13: Navigation mobile + polish responsive

**Files:**
- Create: `components/admin/mobile-nav.tsx`
- Modify: `app/admin/layout.tsx`

**Interfaces:**
- Consumes: `Sidebar` (Phase 1), shadcn `dialog`/`sheet`.
- Produces: barre supérieure mobile avec menu drawer pour l'admin.

- [ ] **Step 1: Ajouter le composant sheet shadcn**

```bash
npx shadcn@latest add sheet --yes
```

- [ ] **Step 2: Navigation mobile**

Create `components/admin/mobile-nav.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { Button } from "@/components/ui/button";

export function MobileNav({ businessName }: { businessName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between border-b border-muted bg-white px-4 py-3 md:hidden">
      <span className="font-display text-lg font-semibold">{businessName}</span>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm">☰ Menu</Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div onClick={() => setOpen(false)}>
            <Sidebar businessName={businessName} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 3: Intégrer dans le layout admin**

Modify `app/admin/layout.tsx` — ajouter la barre mobile au-dessus du contenu :
```tsx
import { MobileNav } from "@/components/admin/mobile-nav";
```
Et restructurer le `return` :
```tsx
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-muted bg-white md:block">
        <Sidebar businessName={businessName} />
      </aside>
      <div className="flex-1">
        <MobileNav businessName={businessName} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
```

- [ ] **Step 4: Test manuel responsive**

Run: `npm run dev`. Réduire la fenêtre sous 768px : la sidebar disparaît, la barre « ☰ Menu » apparaît, le drawer s'ouvre/ferme et navigue. Vérifier que le flux public (`/`, `/reserver/[slug]`, confirmation) est lisible et utilisable en largeur mobile.

- [ ] **Step 5: Commit**

```bash
git add components/admin/mobile-nav.tsx app/admin/layout.tsx
git commit -m "feat: responsive mobile navigation for admin"
```

---

## Task 14: README + script de démo

**Files:**
- Create/replace: `README.md`

**Interfaces:**
- Produces: documentation d'installation, `.env`, lancement, identifiants démo, script de démo.

- [ ] **Step 1: Écrire le README**

Create `README.md`:
```markdown
# Réservation Multi-Espaces — « La Grange Lyotaine » (démo)

Web app de gestion de réservations pour lieu polyvalent (coworking, salles, bureaux).
Espace public de réservation + dashboard admin. Re-skinnable, embeddable, mode démo.

## Stack
Next.js 15 · TypeScript · Tailwind + shadcn/ui · Prisma + PostgreSQL (NeonDB) · NextAuth v5 · Brevo · Google Calendar · @react-pdf/renderer

## Installation

\`\`\`bash
npm install
cp .env.example .env   # puis renseigner DATABASE_URL / DIRECT_URL / NEXTAUTH_SECRET
npx prisma migrate dev
npm run db:seed
npm run dev
\`\`\`

App : http://localhost:3000 · Admin : http://localhost:3000/admin

## Variables d'environnement (.env)
Voir `.env.example`. Points clés :
- `DATABASE_URL` (NeonDB pooler) + `DIRECT_URL` (non-pooled, pour migrate/seed).
- `DEMO_MODE="true"` : emails et events Google **simulés** (logs console) — aucune clé externe requise.
- `BREVO_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_CALENDAR_ID` : optionnels. Renseignés + `DEMO_MODE="false"` → envois réels.
- `ALLOWED_FRAME_ANCESTORS` : domaines autorisés à embarquer l'app en iframe (vide = pas de restriction).

## Identifiants démo
- **Admin :** `admin@demo.fr` / `demo1234`

## Re-skin (nouveau client en 5 min)
Éditer `lib/theme.ts` (nom, logo, couleurs, polices) et remplacer `public/logo.svg`. Aucun autre fichier à toucher.

## Réinitialiser la démo
Bouton « Réinitialiser la démo » dans Admin → Réglages (si `DEMO_MODE=true`), ou `npm run db:seed`.

## Script de démo (à dérouler en live)
1. **Coworking (réservation immédiate)** — sur `/`, ouvrir « Espace Coworking », choisir une date future + formule journée, remplir le formulaire, envoyer → page « Réservation confirmée ✅ ». Console : `📧 [SIMULÉ] Email` + `📅 [SIMULÉ] Event`.
2. **Grande salle (sur demande)** — ouvrir « La Grande Salle », réserver une demi-journée → « Demande bien reçue ✨ » (statut PENDING).
3. **Validation admin** — se connecter (`admin@demo.fr` / `demo1234`), aller dans **Réservations**, filtrer « En attente », **Valider** la demande grande salle en un clic.
4. **Automatisations** — la validation déclenche email de confirmation + contrat PDF (PJ) + event agenda (visibles en logs console en mode démo ; `confirmationEmailSentAt` / `calendarEventId` renseignés en base). Ouvrir la fiche → **Voir le contrat PDF**.
5. **Calendrier & éditeur** — montrer **Calendrier** (rempli, couleurs par espace) et **Modèle de contrat** (éditable, champs de fusion).
6. **Mobile** — réduire la fenêtre : navigation drawer admin + flux public responsive.

## Notes production (hors-périmètre V1)
- Stockage PDF persistant (Vercel Blob) — actuellement généré à la volée.
- Google Calendar OAuth complet (V1 = Service Account).
- Paiement Stripe, facturation, comptes clients, tarification dynamique.
- ⚠️ Régénérer le mot de passe NeonDB avant toute mise en production.
\`\`\`

- [ ] **Step 2: Vérifier le rendu**

Ouvrir `README.md` dans l'IDE, vérifier la mise en forme markdown.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README with setup and demo script"
```

---

## Task 15: Vérification finale (build + tests + scénario)

**Files:** aucun (vérification).

- [ ] **Step 1: Lancer toute la suite de tests**

Run: `npm test`
Expected: tous les tests unitaires PASS (pricing, availability, slots, schema, merge, theme, utils, email, calendar). Le test `.int.test.ts` PASS si la DB est accessible.

- [ ] **Step 2: Build de production**

Run: `npm run build`
Expected: build réussi, aucune erreur de type.

- [ ] **Step 3: Dérouler le script de démo complet**

Run: `npm run db:seed && npm run dev`, puis exécuter les 6 étapes du script de démo du README. Cocher chaque étape.

- [ ] **Step 4: Commit final (si ajustements)**

```bash
git add -A
git commit -m "chore: final verification adjustments"
```

---

## Self-Review (Phase 3)

**Spec coverage (étapes 7-10 du build order) :**
- ✅ Emails Brevo + mode démo — Task 2
- ✅ Génération + envoi auto contrat PDF — Tasks 4, 5, 6, 7, 8
- ✅ Éditeur de modèle de contrat — Task 9
- ✅ Synchro Google Agenda + mode démo — Task 3
- ✅ Workflow `confirmReservation` (statut + email + PDF + calendar) — Task 7
- ✅ Calendrier admin — Task 10
- ✅ Vue d'ensemble KPIs — Task 11
- ✅ Réglages + reset démo — Task 12
- ✅ Polish responsive / nav mobile — Task 13
- ✅ README + script démo — Task 14
- ✅ Vérification finale — Task 15

**Critères « démo réussie » (spec §13) :** couverts par le script de démo (Task 14) et vérifiés en Task 15.

**Type consistency :** `EmailService`/`CalendarService` cohérents entre `types.ts`, impls et workflow. `confirmReservation`/`sendRequestReceived`/`notifyNewRequest`/`sendRejection` importés tels que définis dans les Server Actions. `renderContractPdf` signature `{ title, body, businessName }` identique entre `pdf.tsx`, workflow et route PDF. `mergeTemplate`/`buildMergeContext` cohérents. Les hooks `// TODO Phase 3` de Phase 2 sont tous remplacés (Task 7).

**Placeholder scan :** aucun TODO résiduel après Task 7. Les notes « production » sont des limites V1 documentées, pas des trous d'implémentation.

**Risque connu signalé :** la forme exacte de l'API `@getbrevo/brevo` et de `react-big-calendar` peut varier selon la version — notes ajoutées pour consulter la doc (Context7) ; le mode démo garantit que la présentation ne dépend d'aucune API externe.
```
