"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paymentPublicUrl } from "@/lib/payments";
import { getEmailService, bookingConfirmedClientHtml } from "@/lib/integrations/email";

export async function markPaidAction(paymentId: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await prisma.payments.updateMany({
      where: { id: paymentId, status: "pending" },
      data: { status: "paid", paid_at: new Date() },
    });
    revalidatePath("/admin/seances");
    return {};
  } catch {
    return { error: "Impossible de marquer comme réglé." };
  }
}

export async function resendLinkAction(paymentId: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    const payment = await prisma.payments.findUnique({
      where: { id: paymentId },
      include: { profiles: true },
    });
    if (!payment) return { error: "Paiement introuvable." };
    if (!payment.profiles.email) return { error: "La cliente n'a pas d'email." };
    if (payment.status === "paid") return { error: "Déjà réglé." };

    const email = getEmailService({
      fromEmail: process.env.AUTH_EMAIL_FROM?.trim() || "cdsoimeme@gmail.com",
      fromName: "CD soi-même",
    });
    await email.send({
      to: payment.profiles.email,
      subject: "Régler ta séance — CD soi-même",
      html: bookingConfirmedClientHtml({
        businessName: "CD soi-même",
        clientName: payment.profiles.prenom ?? "",
        prestation: payment.label,
        dateLabel: "",
        intro: "Voici à nouveau le lien pour régler ta séance en ligne.",
        payUrl: paymentPublicUrl(payment.token),
      }),
    });
    return {};
  } catch {
    return { error: "Envoi impossible." };
  }
}
