import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatEuros, formatDateRange } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminHome() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [pendingCount, upcoming, monthRevenue] = await Promise.all([
    prisma.reservation.count({ where: { status: "PENDING" } }),
    prisma.reservation.findMany({
      where: { status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: now } },
      orderBy: { startAt: "asc" }, take: 6, include: { resource: true },
    }),
    prisma.reservation.aggregate({
      _sum: { totalCents: true },
      where: { status: { in: ["CONFIRMED", "COMPLETED"] }, startAt: { gte: monthStart, lt: monthEnd } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Vue d'ensemble</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm text-foreground/60">Demandes en attente</CardTitle></CardHeader><CardContent><p className="font-display text-3xl">{pendingCount}</p></CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm text-foreground/60">Chiffre du mois</CardTitle></CardHeader><CardContent><p className="font-display text-3xl">{formatEuros(monthRevenue._sum.totalCents ?? 0)}</p></CardContent></Card>
        <Card className="rounded-lg"><CardHeader><CardTitle className="text-sm text-foreground/60">À venir</CardTitle></CardHeader><CardContent><p className="font-display text-3xl">{upcoming.length}</p></CardContent></Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Prochaines réservations</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {upcoming.length === 0 && <p className="text-foreground/50">Rien à venir.</p>}
          {upcoming.map((r) => (
            <Link key={r.id} href={`/admin/reservations/${r.id}`} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted">
              <div>
                <p className="font-medium">{r.resource.name} — {r.customerName}</p>
                <p className="text-sm text-foreground/60">{formatDateRange(r.startAt, r.endAt)}</p>
              </div>
              <StatusBadge status={r.status} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
