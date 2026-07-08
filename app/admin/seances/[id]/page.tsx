import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clienteName } from "@/lib/display";
import { PageHeader } from "@/components/admin/ui";
import { SeanceForm } from "./seance-form";
import { paymentPublicUrl } from "@/lib/payments";
import { PaymentPanel } from "./payment-panel";

export const dynamic = "force-dynamic";

export default async function SeanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const s = await prisma.seances.findUnique({ where: { id }, include: { profiles: true } });
  if (!s) notFound();

  const payment = await prisma.payments.findFirst({
    where: { seance_id: s.id },
    orderBy: { created_at: "desc" },
  });

  const who = clienteName(s.profiles) !== "—" ? clienteName(s.profiles) : (s.nom_externe ?? "Séance");

  return (
    <div>
      <PageHeader
        title={who}
        subtitle="Détail de la séance"
        action={<Link href="/admin/seances" className="text-sm text-foreground/55 hover:text-foreground">← Séances</Link>}
      />
      <SeanceForm
        id={s.id}
        sent={s.statut_envoi === "envoye"}
        initial={{
          type: s.type,
          date: format(s.date, "yyyy-MM-dd'T'HH:mm"),
          lieu: s.lieu ?? "",
          notes: s.notes ?? "",
          exercices: s.exercices ?? "",
        }}
      />
      {payment && (
        <PaymentPanel
          paymentId={payment.id}
          status={payment.status}
          amountLabel={(payment.amount_cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
          payUrl={paymentPublicUrl(payment.token)}
        />
      )}
    </div>
  );
}
