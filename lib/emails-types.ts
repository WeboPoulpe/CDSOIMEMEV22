export type EmailMsg = { subject: string; intro: string };
export type EmailKey = "booking_received" | "booking_confirmed" | "questionnaire";
export type EmailMessages = Record<EmailKey, EmailMsg>;

export const EMAIL_KEY = "emails";

export const EMAIL_LABELS: Record<EmailKey, string> = {
  booking_received: "Demande de rendez-vous reçue (cliente)",
  booking_confirmed: "Rendez-vous confirmé (cliente)",
  questionnaire: "Envoi du questionnaire",
};

export const DEFAULT_EMAILS: EmailMessages = {
  booking_received: {
    subject: "Ta demande de rendez-vous — CD soi-même",
    intro: "Ta demande de rendez-vous a bien été reçue.",
  },
  booking_confirmed: {
    subject: "Rendez-vous confirmé — CD soi-même",
    intro: "Ton rendez-vous est confirmé.",
  },
  questionnaire: {
    subject: "Ton questionnaire — CD soi-même",
    intro: "Avant notre rendez-vous, peux-tu prendre un moment pour remplir ce court questionnaire ? Il m'aide à préparer au mieux ton accompagnement.",
  },
};
