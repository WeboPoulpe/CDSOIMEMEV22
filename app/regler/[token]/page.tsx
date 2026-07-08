import { prisma } from "@/lib/db";
import { theme } from "@/lib/theme";
import { shouldMarkSimPaid } from "@/lib/payments";
import { startCheckoutAction } from "./actions";

export const dynamic = "force-dynamic";

function euros(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export default async function ReglerPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await params;
  const { status } = await searchParams;
  const payment = await prisma.payments.findUnique({ where: { token } });

  // Simulated sessions never fire a webhook: mark paid on the success return.
  if (payment && shouldMarkSimPaid(payment, status)) {
    await prisma.payments.update({
      where: { id: payment.id },
      data: { status: "paid", paid_at: new Date() },
    });
    payment.status = "paid";
  }

  const confirmedPaid = payment?.status === "paid";
  const awaitingConfirmation = !confirmedPaid && status === "success";

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="relative z-10 w-full max-w-sm">
        <div className="surface-soft rounded-[1.75rem] p-8 text-center shadow-xl shadow-primary/5">
          <p className="font-serif text-2xl tracking-tight text-foreground">{theme.business.name}</p>

          {!payment ? (
            <p className="mt-6 text-sm text-red-600">Ce lien de paiement est invalide.</p>
          ) : confirmedPaid ? (
            <>
              <p className="mt-4 text-sm text-foreground/60">Paiement bien reçu</p>
              <p className="mt-2 text-lg text-foreground">Merci ! Ta séance « {payment.label} » est réglée 🌿</p>
            </>
          ) : awaitingConfirmation ? (
            <>
              <p className="mt-4 text-sm text-foreground/60">Paiement en cours de confirmation</p>
              <p className="mt-2 text-lg text-foreground">Merci ! Nous confirmons ton paiement très vite. 🌿</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-foreground/55">Régler ta séance</p>
              <p className="mt-6 font-serif text-3xl text-foreground">{euros(payment.amount_cents)}</p>
              <p className="mt-1 text-sm text-foreground/60">{payment.label}</p>
              {status === "cancel" && (
                <p className="mt-4 text-sm text-foreground/55">Paiement annulé — tu peux réessayer quand tu veux.</p>
              )}
              {status === "error" && (
                <p className="mt-4 text-sm text-red-600">Le paiement n'a pas pu démarrer. Réessaie dans un instant.</p>
              )}
              <form action={startCheckoutAction.bind(null, token)} className="mt-7">
                <button
                  type="submit"
                  className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:opacity-90"
                >
                  Payer {euros(payment.amount_cents)}
                </button>
              </form>
              <p className="mt-3 text-xs text-foreground/45">Paiement sécurisé par Stripe.</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
