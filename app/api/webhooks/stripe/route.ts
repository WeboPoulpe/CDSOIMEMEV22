import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaymentService } from "@/lib/integrations/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rawBody = await req.text(); // raw body required for signature verification
  const signature = req.headers.get("stripe-signature");

  const outcome = getPaymentService().verifyWebhook(rawBody, signature);

  if (outcome.status === "invalid") {
    // Bad/missing signature → 400 so Stripe marks the delivery failed and retries
    // (surfaces a misconfigured STRIPE_WEBHOOK_SECRET instead of dropping payments silently).
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (outcome.status === "fulfill") {
    // Idempotent: only flip pending → paid once.
    await prisma.payments.updateMany({
      where: { id: outcome.paymentId, status: "pending" },
      data: {
        status: "paid",
        paid_at: new Date(),
        stripe_payment_intent: outcome.paymentIntent ?? null,
      },
    });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
