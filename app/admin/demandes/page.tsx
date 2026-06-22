import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clienteName, formatDateTime, bookingStatusOf } from "@/lib/display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemandeActions } from "./demande-actions";

export default async function DemandesPage() {
  await requireAdmin();
  const demandes = await prisma.booking_requests.findMany({
    orderBy: [{ status: "asc" }, { requested_date: "desc" }],
    include: { care_types: true, profiles: true },
  });
  const pending = demandes.filter((d) => d.status === "pending");
  const others = demandes.filter((d) => d.status !== "pending");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Demandes de rendez-vous</h1>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>À traiter ({pending.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 && <p className="text-foreground/50">Aucune demande en attente.</p>}
          {pending.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-3">
              <div>
                <p className="font-medium">{clienteName(d.profiles)} — {d.care_types.nom}</p>
                <p className="text-sm text-foreground/60">{formatDateTime(d.requested_date)}</p>
                {d.notes && <p className="mt-1 text-sm text-foreground/55">« {d.notes} »</p>}
              </div>
              <DemandeActions id={d.id} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Historique</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {others.length === 0 && <p className="text-foreground/50">Rien pour l'instant.</p>}
          {others.map((d) => {
            const st = bookingStatusOf(d.status);
            return (
              <div key={d.id} className="flex items-center justify-between rounded-lg px-3 py-2">
                <div>
                  <p className="font-medium">{clienteName(d.profiles)} — {d.care_types.nom}</p>
                  <p className="text-sm text-foreground/60">{formatDateTime(d.requested_date)}</p>
                  {d.refusal_reason && <p className="text-sm text-foreground/55">Motif : {d.refusal_reason}</p>}
                </div>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
