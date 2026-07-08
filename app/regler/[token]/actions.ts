"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPaymentService } from "@/lib/integrations/payments";
import { checkoutUrls } from "@/lib/payments";

export async function startCheckoutAction(token: string): Promise<void> {
  const payment = await prisma.payments.findUnique({ where: { token } });
  if (!payment) redirect(`/regler/${token}?status=error`);
  if (payment.status === "paid") redirect(`/regler/${token}?status=success`);

  const { successUrl, cancelUrl } = checkoutUrls(token);
  let url: string;
  try {
    const session = await getPaymentService().createCheckoutSession({
      amountCents: payment.amount_cents,
      currency: payment.currency,
      label: payment.label,
      successUrl,
      cancelUrl,
      metadata: { paymentId: payment.id },
    });
    if (!session.url) throw new Error("Stripe returned no checkout url");
    await prisma.payments.update({
      where: { id: payment.id },
      data: { stripe_session_id: session.id },
    });
    url = session.url;
  } catch (e) {
    console.error("⚠️ création de la session Stripe échouée:", e);
    redirect(`/regler/${token}?status=error`);
  }
  redirect(url);
}
