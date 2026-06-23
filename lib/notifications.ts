import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  getEmailService,
  bookingReceivedClientHtml,
  bookingNotifyPraticienneHtml,
  bookingConfirmedClientHtml,
} from "@/lib/integrations/email";

const BRAND = "CD soi-même";
const FROM = process.env.AUTH_EMAIL_FROM?.trim() || "cdsoimeme@gmail.com";
const PRATICIENNE = process.env.AUTH_EMAIL_FROM?.trim() || "cdsoimeme@gmail.com";

/** Human label for a rendez-vous date, e.g. "lundi 29 juin 2026 à 10:00". */
export function rdvDateLabel(d: Date): string {
  return format(d, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
}

/** On a new booking request: acknowledge the cliente + notify Charline. Best-effort. */
export async function notifyBookingReceived(p: {
  clientEmail: string;
  clientName: string;
  prestation: string;
  date: Date;
}): Promise<void> {
  const email = getEmailService({ fromEmail: FROM, fromName: BRAND });
  const dateLabel = rdvDateLabel(p.date);
  try {
    await email.send({
      to: p.clientEmail,
      toName: p.clientName,
      subject: `Ta demande de rendez-vous — ${BRAND}`,
      html: bookingReceivedClientHtml({ businessName: BRAND, clientName: p.clientName, prestation: p.prestation, dateLabel }),
    });
  } catch (e) {
    console.error("⚠️ email accusé cliente:", e);
  }
  try {
    await email.send({
      to: PRATICIENNE,
      subject: `Nouvelle demande — ${p.clientName}`,
      html: bookingNotifyPraticienneHtml({ clientName: p.clientName, clientEmail: p.clientEmail, prestation: p.prestation, dateLabel }),
    });
  } catch (e) {
    console.error("⚠️ email notif praticienne:", e);
  }
}

/** On validation: confirm to the cliente. Best-effort. */
export async function notifyBookingConfirmed(p: {
  clientEmail: string;
  clientName: string;
  prestation: string;
  date: Date;
}): Promise<void> {
  const email = getEmailService({ fromEmail: FROM, fromName: BRAND });
  try {
    await email.send({
      to: p.clientEmail,
      toName: p.clientName,
      subject: `Rendez-vous confirmé — ${BRAND}`,
      html: bookingConfirmedClientHtml({ businessName: BRAND, clientName: p.clientName, prestation: p.prestation, dateLabel: rdvDateLabel(p.date) }),
    });
  } catch (e) {
    console.error("⚠️ email confirmation cliente:", e);
  }
}
