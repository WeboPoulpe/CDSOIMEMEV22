import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clienteName, formatDateTime } from "@/lib/display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SeancesPage() {
  await requireAdmin();
  const now = new Date();
  const seances = await prisma.seances.findMany({
    orderBy: { date: "desc" },
    include: { profiles: true },
    take: 100,
  });
  const upcoming = seances.filter((s) => s.date >= now).reverse();
  const past = seances.filter((s) => s.date < now);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Séances</h1>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>À venir ({upcoming.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {upcoming.length === 0 && <p className="text-foreground/50">Aucune séance à venir.</p>}
          {upcoming.map((s) => (
            <Row key={s.id} type={s.type} who={clienteName(s.profiles) !== "—" ? clienteName(s.profiles) : (s.nom_externe ?? "—")} when={formatDateTime(s.date)} lieu={s.lieu} />
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Passées</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {past.length === 0 && <p className="text-foreground/50">Aucune séance passée.</p>}
          {past.map((s) => (
            <Row key={s.id} type={s.type} who={clienteName(s.profiles) !== "—" ? clienteName(s.profiles) : (s.nom_externe ?? "—")} when={formatDateTime(s.date)} lieu={s.lieu} muted />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ type, who, when, lieu, muted }: { type: string; who: string; when: string; lieu: string | null; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${muted ? "" : "bg-muted/40"}`}>
      <div>
        <p className="font-medium">{who} — {type}</p>
        {lieu && <p className="text-sm text-foreground/55">{lieu}</p>}
      </div>
      <span className="text-sm text-foreground/60">{when}</span>
    </div>
  );
}
