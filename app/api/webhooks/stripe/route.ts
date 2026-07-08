import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaymentService } from "@/lib/integrations/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rawBody = await req.text(); // raw body required for signature verification
  const signature = req.headers.get("stripe-signature");

  const result = getPaymentService().verifyWebhook(rawBody, signature);
  if (!result) {
    // Bad signature, simulated mode, or irrelevant event.
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (result.paymentId) {
    // Idempotent: only flip pending → paid once.
    await prisma.payments.updateMany({
      where: { id: result.paymentId, status: "pending" },
      data: {
        status: "paid",
        paid_at: new Date(),
        stripe_payment_intent: result.paymentIntent ?? null,
      },
    });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
