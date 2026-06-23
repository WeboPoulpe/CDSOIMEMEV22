import Link from "next/link";
import { CalendarHeart, FileText, MessageCircle } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";
import { clienteName, formatDateTime } from "@/lib/display";
import { PageHeader, SectionCard, EmptyState } from "@/components/admin/ui";

export default async function EspacePage() {
  const session = await requireClient();
  const profile = await currentClienteProfile(session.user.id);

  if (!profile) {
    return (
      <div>
        <PageHeader title="Bienvenue ✨" subtitle="Ton espace de soin et d'accompagnement." />
        <SectionCard>
          <p className="text-foreground/60">
            Ton espace est en cours de configuration. Charline va bientôt le compléter.
          </p>
        </SectionCard>
      </div>
    );
  }

  const now = new Date();
  const [seances, demandes] = await Promise.all([
    prisma.seances.findMany({ where: { cliente_id: profile.id, date: { gte: now } }, orderBy: { date: "asc" } }),
    prisma.booking_requests.findMany({
      where: { cliente_id: profile.id, status: { in: ["pending", "confirmed"] }, requested_date: { gte: now } },
      orderBy: { requested_date: "asc" },
      include: { care_types: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={`Bonjour ${profile.prenom ?? clienteName(profile)} ✨`}
        subtitle="Ton espace de soin et d'accompagnement."
      />

      <SectionCard title="Mes prochaines séances">
        <div className="space-y-2">
          {seances.length === 0 && demandes.length === 0 && (
            <EmptyState>Aucune séance à venir pour le moment.</EmptyState>
          )}
          {seances.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <span className="font-medium text-foreground">{s.type}</span>
              <span className="text-sm text-foreground/70">{formatDateTime(s.date)}</span>
            </div>
          ))}
          {demandes.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-dashed border-primary/20 px-4 py-3">
              <span className="font-medium text-foreground">{d.care_types.nom}</span>
              <span className="text-sm text-foreground/55">
                {formatDateTime(d.requested_date)} · {d.status === "confirmed" ? "confirmé" : "en attente"}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Tile href="/espace/reserver" icon={CalendarHeart} label="Prendre rendez-vous" tone="bg-primary/12 text-primary" />
        <Tile href="/espace/documents" icon={FileText} label="Mes documents" tone="bg-secondary/15 text-secondary" />
        <Tile href="/espace/messagerie" icon={MessageCircle} label="Messagerie" tone="bg-[#C9A24B]/18 text-[#A8842F]" />
      </div>
    </div>
  );
}

function Tile({ href, icon: Icon, label, tone }: { href: string; icon: typeof CalendarHeart; label: string; tone: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-primary/10 bg-card/70 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/25">
      <span className={`mb-3 grid h-10 w-10 place-items-center rounded-full ${tone}`}><Icon className="h-5 w-5" /></span>
      <p className="font-serif text-lg text-foreground">{label}</p>
    </Link>
  );
}
