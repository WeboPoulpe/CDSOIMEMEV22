import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/display";
import { PageHeader, SectionCard, EmptyState } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const CONTEXT_LABEL: Record<string, string> = {
  reservation: "Réservation",
  questionnaire: "Questionnaire",
};

export default async function RgpdPage() {
  await requireAdmin();

  const [consents, erasureRaw] = await Promise.all([
    prisma.consent_logs.findMany({ orderBy: { consented_at: "desc" }, take: 100 }),
    prisma.notifications.findMany({ where: { type: "erasure_request" }, orderBy: { created_at: "desc" } }),
  ]);

  // Dédoublonnage des demandes d'effacement (une notif par praticienne) par cliente.
  const seen = new Set<string>();
  const erasures = erasureRaw.filter((n) => {
    const k = n.related_id ?? n.id;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return (
    <div>
      <PageHeader title="RGPD" subtitle="Registre des consentements et demandes d'effacement." />

      <div className="space-y-6">
        <SectionCard title={`Demandes de suppression (${erasures.length})`}>
          <div className="space-y-2">
            {erasures.length === 0 && <EmptyState>Aucune demande d'effacement.</EmptyState>}
            {erasures.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{e.body}</p>
                  <p className="text-xs text-foreground/50">{formatDateTime(e.created_at)}</p>
                </div>
                {e.related_id && (
                  <Link href={`/admin/clientes/${e.related_id}`} className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground">
                    Traiter
                  </Link>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={`Registre des consentements (${consents.length})`}>
          <div className="space-y-1.5">
            {consents.length === 0 && <EmptyState>Aucun consentement enregistré.</EmptyState>}
            {consents.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/40">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{CONTEXT_LABEL[c.context] ?? c.context}</Badge>
                  <span className="text-foreground/75">{c.email ?? "—"}</span>
                </div>
                <span className="text-xs text-foreground/45">
                  {formatDateTime(c.consented_at)}{c.ip ? ` · ${c.ip}` : ""}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
