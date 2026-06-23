import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users, Inbox, CalendarDays, MessageCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clienteName, formatDateTime } from "@/lib/display";
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/admin/ui";

export default async function AdminHome() {
  const session = await requireAdmin();
  const firstName = (session.user.name || "Charline").split(" ")[0];
  const now = new Date();

  const [clientesCount, pendingCount, upcomingCount, unreadCount, pending, upcoming, messages] =
    await Promise.all([
      prisma.profiles.count(),
      prisma.booking_requests.count({ where: { status: "pending" } }),
      prisma.seances.count({ where: { date: { gte: now } } }),
      prisma.messages.count({ where: { expediteur: "cliente", lu: false } }),
      prisma.booking_requests.findMany({
        where: { status: "pending" },
        orderBy: { requested_date: "asc" },
        include: { care_types: true, profiles: true },
        take: 5,
      }),
      prisma.seances.findMany({
        where: { date: { gte: now } },
        orderBy: { date: "asc" },
        include: { profiles: true },
        take: 5,
      }),
      prisma.messages.findMany({
        orderBy: { created_at: "desc" },
        include: { profiles: true },
        take: 4,
      }),
    ]);

  return (
    <div>
      <PageHeader
        title={`Bonjour ${firstName} ✨`}
        subtitle={`Nous sommes ${format(now, "EEEE d MMMM", { locale: fr })}. Voici ta journée.`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Inbox} tone="rose" label="Demandes à traiter" value={pendingCount} href="/admin/demandes" />
        <StatCard icon={CalendarDays} tone="mauve" label="Séances à venir" value={upcomingCount} href="/admin/seances" />
        <StatCard icon={MessageCircle} tone="gold" label="Messages non lus" value={unreadCount} />
        <StatCard icon={Users} tone="sage" label="Clientes" value={clientesCount} href="/admin/clientes" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Demandes à traiter"
          action={<Link href="/admin/demandes" className="text-sm text-primary hover:underline">Tout voir</Link>}
        >
          <div className="space-y-2">
            {pending.length === 0 && <EmptyState>Tout est à jour — rien en attente 🌸</EmptyState>}
            {pending.map((d) => (
              <Link key={d.id} href="/admin/demandes" className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{clienteName(d.profiles)}</p>
                  <p className="truncate text-sm text-foreground/55">{d.care_types.nom}</p>
                </div>
                <span className="ml-3 shrink-0 text-sm text-foreground/55">{formatDateTime(d.requested_date)}</span>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Prochaines séances"
          action={<Link href="/admin/seances" className="text-sm text-primary hover:underline">Tout voir</Link>}
        >
          <div className="space-y-2">
            {upcoming.length === 0 && <EmptyState>Aucune séance planifiée pour l'instant.</EmptyState>}
            {upcoming.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {clienteName(s.profiles) !== "—" ? clienteName(s.profiles) : (s.nom_externe ?? "—")}
                  </p>
                  <p className="truncate text-sm text-foreground/55">{s.type}</p>
                </div>
                <span className="ml-3 shrink-0 text-sm text-foreground/55">{formatDateTime(s.date)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Messages récents">
          <div className="space-y-3">
            {messages.length === 0 && <EmptyState>Aucun message pour le moment.</EmptyState>}
            {messages.map((m) => (
              <Link
                key={m.id}
                href={`/admin/clientes/${m.cliente_id}`}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60"
              >
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs ${m.expediteur === "cliente" ? "bg-primary/12 text-primary" : "bg-secondary/15 text-secondary"}`}>
                  {clienteName(m.profiles).slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {clienteName(m.profiles)}
                    {m.expediteur === "cliente" && !m.lu && <span className="ml-2 rounded-full bg-primary/12 px-2 py-0.5 text-xs text-primary">nouveau</span>}
                  </p>
                  <p className="truncate text-sm text-foreground/55">{m.contenu}</p>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
