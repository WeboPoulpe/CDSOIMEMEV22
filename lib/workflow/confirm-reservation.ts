import { prisma } from "@/lib/db";
import {
  getEmailService,
  confirmationEmailHtml,
  requestReceivedEmailHtml,
  rejectionEmailHtml,
  adminNotificationEmailHtml,
} from "@/lib/integrations/email";
import { getCalendarService } from "@/lib/integrations/calendar";
import { mergeTemplate } from "@/lib/contracts/merge";
import { buildMergeContext } from "@/lib/contracts/build-context";
import { renderContractPdf } from "@/lib/contracts/pdf";
import { formatDateRange, formatEuros } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Internal helper — loads reservation + resource + settings in one shot
// ---------------------------------------------------------------------------

async function loadFull(reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { resource: true },
  });
  if (!reservation) throw new Error("Réservation introuvable.");
  const settings = await prisma.settings.findFirst();
  return { reservation, resource: reservation.resource, settings };
}

// ---------------------------------------------------------------------------
// confirmReservation
//
// Called AFTER the DB transaction that sets status = CONFIRMED has committed
// (either from createReservation auto-confirm path or from validateReservationAction).
// Must NOT be called from inside a prisma.$transaction — it does external I/O.
//
// Idempotent: skips email send if confirmationEmailSentAt already set,
//             skips calendar event if calendarEventId already set.
// Each step is best-effort: one failing integration does not abort the others.
// ---------------------------------------------------------------------------

export async function confirmReservation(reservationId: string): Promise<void> {
  const { reservation, resource, settings } = await loadFull(reservationId);
  const range = formatDateRange(reservation.startAt, reservation.endAt);

  const email = getEmailService({
    fromEmail: settings?.fromEmail ?? "no-reply@demo.fr",
    fromName: settings?.businessName ?? "Réservations",
  });
  const calendar = getCalendarService();

  // ── 1. Contract generation (best-effort) ────────────────────────────────
  // Select template: resource-type-specific first, then global (appliesTo: null)
  let attachmentBase64: string | undefined;
  try {
    const template =
      (await prisma.contractTemplate.findFirst({
        where: { active: true, appliesTo: resource.type },
      })) ??
      (await prisma.contractTemplate.findFirst({
        where: { active: true, appliesTo: null },
      }));

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
        create: {
          reservationId,
          templateId: template.id,
          bodySnapshot: merged,
          sentAt: new Date(),
          pdfUrl: `/admin/reservations/${reservationId}/contract.pdf`,
        },
        update: {
          templateId: template.id,
          bodySnapshot: merged,
          sentAt: new Date(),
        },
      });
    }
  } catch (e) {
    console.error("⚠️ Génération contrat échouée:", e);
  }

  // ── 2. Confirmation email (best-effort, idempotency guard) ───────────────
  // Skip if already sent (e.g. retry / re-validate scenario)
  if (!reservation.confirmationEmailSentAt) {
    try {
      const res = await email.send({
        to: reservation.customerEmail,
        toName: reservation.customerName,
        subject: `Réservation confirmée — ${resource.name}`,
        html: confirmationEmailHtml({
          businessName: settings?.businessName ?? "Le lieu",
          resourceName: resource.name,
          range,
          total: formatEuros(reservation.totalCents),
        }),
        attachment: attachmentBase64
          ? { name: "contrat.pdf", contentBase64: attachmentBase64 }
          : undefined,
      });
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { confirmationEmailSentAt: new Date() },
      });
      console.log(
        `Email confirmation ${res.simulated ? "[simulé]" : "[réel]"} → ${reservation.customerEmail}`
      );
    } catch (e) {
      console.error("⚠️ Email confirmation échoué:", e);
    }
  }

  // ── 3. Calendar event (best-effort, idempotency guard) ───────────────────
  // Skip if already created (prevents duplicate events on retry)
  if (!reservation.calendarEventId) {
    try {
      const evt = await calendar.createEvent({
        summary: `${resource.name} — ${reservation.customerName}`,
        description: `Réservation ${formatEuros(reservation.totalCents)}. Contact: ${reservation.customerEmail}`,
        startAt: reservation.startAt,
        endAt: reservation.endAt,
      });
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { calendarEventId: evt.id },
      });
    } catch (e) {
      console.error("⚠️ Event agenda échoué:", e);
    }
  }
}

// ---------------------------------------------------------------------------
// sendRequestReceived — notify the customer their PENDING request was received
// Called AFTER createReservation returns (outside any transaction).
// ---------------------------------------------------------------------------

export async function sendRequestReceived(reservationId: string): Promise<void> {
  const { reservation, resource, settings } = await loadFull(reservationId);
  const email = getEmailService({
    fromEmail: settings?.fromEmail ?? "no-reply@demo.fr",
    fromName: settings?.businessName ?? "Réservations",
  });
  const range = formatDateRange(reservation.startAt, reservation.endAt);
  try {
    await email.send({
      to: reservation.customerEmail,
      toName: reservation.customerName,
      subject: `Demande reçue — ${resource.name}`,
      html: requestReceivedEmailHtml({
        businessName: settings?.businessName ?? "Le lieu",
        resourceName: resource.name,
        range,
      }),
    });
  } catch (e) {
    console.error("⚠️ Email demande reçue échoué:", e);
  }
}

// ---------------------------------------------------------------------------
// notifyNewRequest — alert the admin about a new PENDING reservation
// Called AFTER createReservation returns (outside any transaction).
// ---------------------------------------------------------------------------

export async function notifyNewRequest(reservationId: string): Promise<void> {
  const { reservation, resource, settings } = await loadFull(reservationId);
  if (!settings?.contactEmail) return;
  const email = getEmailService({
    fromEmail: settings.fromEmail,
    fromName: settings.businessName,
  });
  const range = formatDateRange(reservation.startAt, reservation.endAt);
  try {
    await email.send({
      to: settings.contactEmail,
      subject: `Nouvelle demande — ${resource.name}`,
      html: adminNotificationEmailHtml({
        resourceName: resource.name,
        customerName: reservation.customerName,
        range,
      }),
    });
  } catch (e) {
    console.error("⚠️ Notif admin échouée:", e);
  }
}

// ---------------------------------------------------------------------------
// sendRejection — notify the customer their request was rejected
// Called AFTER the REJECTED status is committed (outside any transaction).
// TODO: delete calendarEventId event on reject/cancel
// ---------------------------------------------------------------------------

export async function sendRejection(reservationId: string): Promise<void> {
  const { reservation, resource, settings } = await loadFull(reservationId);
  const email = getEmailService({
    fromEmail: settings?.fromEmail ?? "no-reply@demo.fr",
    fromName: settings?.businessName ?? "Réservations",
  });
  try {
    await email.send({
      to: reservation.customerEmail,
      toName: reservation.customerName,
      subject: `Votre demande — ${resource.name}`,
      html: rejectionEmailHtml({
        businessName: settings?.businessName ?? "Le lieu",
        resourceName: resource.name,
      }),
    });
  } catch (e) {
    console.error("⚠️ Email refus échoué:", e);
  }
}
