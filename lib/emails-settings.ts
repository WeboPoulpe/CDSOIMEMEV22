import { prisma } from "@/lib/db";
import { DEFAULT_EMAILS, EMAIL_KEY, type EmailKey, type EmailMsg, type EmailMessages } from "@/lib/emails-types";

export { EMAIL_LABELS, DEFAULT_EMAILS } from "@/lib/emails-types";
export type { EmailKey, EmailMsg, EmailMessages } from "@/lib/emails-types";

export async function getEmailMessages(): Promise<EmailMessages> {
  const row = await prisma.app_settings.findUnique({ where: { key: EMAIL_KEY } });
  const v = (row?.value ?? {}) as Partial<Record<EmailKey, Partial<EmailMsg>>>;
  return {
    booking_received: { ...DEFAULT_EMAILS.booking_received, ...(v.booking_received ?? {}) },
    booking_confirmed: { ...DEFAULT_EMAILS.booking_confirmed, ...(v.booking_confirmed ?? {}) },
    questionnaire: { ...DEFAULT_EMAILS.questionnaire, ...(v.questionnaire ?? {}) },
    reset: { ...DEFAULT_EMAILS.reset, ...(v.reset ?? {}) },
    booking_notify: { ...DEFAULT_EMAILS.booking_notify, ...(v.booking_notify ?? {}) },
  };
}

export async function saveEmailMessages(m: EmailMessages): Promise<void> {
  await prisma.app_settings.upsert({
    where: { key: EMAIL_KEY },
    create: { key: EMAIL_KEY, value: m as object, updated_at: new Date() },
    update: { value: m as object, updated_at: new Date() },
  });
}
