import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";
import { clienteName, formatDateTime } from "@/lib/display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EspacePage() {
  const session = await requireClient();
  const profile = await currentClienteProfile(session.user.id);

  if (!profile) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl">Bienvenue ✨</h1>
        <p className="text-foreground/60">
          Votre espace est en cours de configuration. Votre praticienne va bientôt le compléter.
        </p>
      </div>
    );
  }

  const now = new Date();
  const [seances, demandes] = await Promise.all([
    prisma.seances.findMany({
      where: { cliente_id: profile.id, date: { gte: now } },
      orderBy: { date: "asc" },
    }),
    prisma.booking_requests.findMany({
      where: { cliente_id: profile.id, status: { in: ["pending", "confirmed"] }, requested_date: { gte: now } },
      orderBy: { requested_date: "asc" },
      include: { care_types: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Bonjour {profile.prenom ?? clienteName(profile)} ✨</h1>
        <p className="text-foreground/60">Votre espace de soin et d'accompagnement.</p>
      </div>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Mes prochaines séances</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {seances.length === 0 && demandes.length === 0 && (
            <p className="text-foreground/50">Aucune séance à venir pour le moment.</p>
          )}
          {seances.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <span className="font-medium">{s.type}</span>
              <span className="text-sm text-foreground/70">{formatDateTime(s.date)}</span>
            </div>
          ))}
          {demandes.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-dashed border-muted px-4 py-3">
              <span className="font-medium">{d.care_types.nom}</span>
              <span className="text-sm text-foreground/55">
                {formatDateTime(d.requested_date)} · {d.status === "confirmed" ? "confirmé" : "en attente"}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/espace/documents">
          <Card className="rounded-lg transition-shadow hover:shadow-md">
            <CardHeader><CardTitle className="text-base">Mes documents</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-foreground/55">Consulter les documents partagés</p></CardContent>
          </Card>
        </Link>
        <Link href="/espace/messagerie">
          <Card className="rounded-lg transition-shadow hover:shadow-md">
            <CardHeader><CardTitle className="text-base">Messagerie</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-foreground/55">Échanger avec votre praticienne</p></CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
