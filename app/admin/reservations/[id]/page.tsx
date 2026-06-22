import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/admin/status-badge";
import { PaymentBadge } from "@/components/admin/payment-badge";
import { PaymentToggle } from "@/components/admin/payment-toggle";
import { ReservationActions } from "@/components/admin/reservation-actions";
import { CancelReservationButton } from "@/components/admin/cancel-reservation-button";
import { formatEuros, formatDateRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReservationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await prisma.reservation.findUnique({ where: { id }, include: { resource: true } });
  if (!r) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl">{r.resource.name}</h1>
        <div className="flex items-center gap-2">
          <StatusBadge status={r.status} />
          {r.status === "CONFIRMED" && <PaymentBadge status={r.paymentStatus} />}
        </div>
      </div>
      <Card className="rounded-lg">
        <CardHeader><CardTitle className="text-lg">Détails</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Client :</strong> {r.customerName} — {r.customerEmail}</p>
          {r.customerPhone && <p><strong>Téléphone :</strong> {r.customerPhone}</p>}
          {r.company && <p><strong>Société :</strong> {r.company}</p>}
          <p><strong>Créneau :</strong> {formatDateRange(r.startAt, r.endAt)}</p>
          <p><strong>Total :</strong> {formatEuros(r.totalCents)}</p>
          {r.message && <p><strong>Message :</strong> {r.message}</p>}
        </CardContent>
      </Card>
      {r.status === "PENDING" && <ReservationActions id={r.id} />}
      {r.status === "CONFIRMED" && (
        <div className="space-y-3">
          <PaymentToggle id={r.id} paid={r.paymentStatus === "PAID"} />
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={`/admin/reservations/${r.id}/contract.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              📄 Voir le contrat PDF
            </a>
            <CancelReservationButton id={r.id} />
          </div>
        </div>
      )}
    </div>
  );
}
