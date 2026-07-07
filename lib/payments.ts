import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { toAmountCents } from "@/lib/integrations/payments";

function baseUrl(): string {
  return (process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
}

export function newPaymentToken(): string {
  return randomBytes(24).toString("base64url");
}

export function paymentPublicUrl(token: string): string {
  return `${baseUrl()}/regler/${token}`;
}

export function checkoutUrls(token: string): { successUrl: string; cancelUrl: string } {
  const u = paymentPublicUrl(token);
  return { successUrl: `${u}?status=success`, cancelUrl: `${u}?status=cancel` };
}

/**
 * Create a pending payment for a séance. Returns the token, or null when the
 * prestation has no price (nothing to charge).
 */
export async function createSeancePayment(args: {
  clienteId: string;
  seanceId: string | null;
  prix: unknown;
  label: string;
}): Promise<string | null> {
  const amount = toAmountCents(args.prix);
  if (amount <= 0) return null;
  const token = newPaymentToken();
  await prisma.payments.create({
    data: {
      cliente_id: args.clienteId,
      seance_id: args.seanceId,
      token,
      amount_cents: amount,
      currency: "eur",
      label: args.label,
      status: "pending",
    },
  });
  return token;
}
