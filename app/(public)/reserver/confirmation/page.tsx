import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatEuros, formatDateRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; ids?: string; auto?: string }>;
}) {
  const { id, ids, auto } = await searchParams;
  const idList = (ids ? ids.split(",") : id ? [id] : []).filter(Boolean);
  if (idList.length === 0) notFound();

  const reservations = await prisma.reservation.findMany({
    where: { id: { in: idList } },
    include: { resource: true },
    orderBy: { startAt: "asc" },
  });
  if (reservations.length === 0) notFound();

  const autoConfirmed = auto === "1";
  const multiple = reservations.length > 1;
  const grandTotal = reservations.reduce((s, r) => s + r.totalCents, 0);

  return (
    <div className="mx-auto max-w-lg">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            {autoConfirmed ? "Réservation confirmée ✅" : "Demande bien reçue ✨"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            {autoConfirmed
              ? `${multiple ? "Vos réservations sont confirmées" : "Votre réservation est confirmée"}. Un email de confirmation vous a été envoyé.`
              : `${multiple ? "Vos demandes ont été transmises" : "Votre demande a été transmise"} au gérant. Vous recevrez un email dès validation.`}
          </p>

          <div className="space-y-2">
            {reservations.map((r) => (
              <div key={r.id} className="rounded-lg bg-muted p-4">
                <p className="font-medium">{r.resource.name}</p>
                <p className="text-foreground/70">{formatDateRange(r.startAt, r.endAt)}</p>
                <p className="text-foreground/70">{formatEuros(r.totalCents)}</p>
              </div>
            ))}
          </div>

          {multiple && (
            <p className="font-medium">
              Total : {formatEuros(grandTotal)} · {reservations.length} créneaux
            </p>
          )}

          <a href="/" className="inline-block text-primary underline">← Retour à l&apos;accueil</a>
        </CardContent>
      </Card>
    </div>
  );
}
