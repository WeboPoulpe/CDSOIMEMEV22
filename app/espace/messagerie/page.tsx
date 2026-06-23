import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";
import { formatDateTime } from "@/lib/display";
import { PageHeader, SectionCard, EmptyState } from "@/components/admin/ui";
import { Composer } from "./composer";

export default async function EspaceMessageriePage() {
  const session = await requireClient();
  const profile = await currentClienteProfile(session.user.id);

  const messages = profile
    ? await prisma.messages.findMany({ where: { cliente_id: profile.id }, orderBy: { created_at: "asc" } })
    : [];

  return (
    <div>
      <PageHeader title="Messagerie" subtitle="Échange en toute simplicité avec ta praticienne." />

      <SectionCard title="Votre conversation">
        <div className="space-y-3">
          {messages.length === 0 && <EmptyState>Aucun message. Écris le premier ci-dessous.</EmptyState>}
          {messages.map((m) => {
            const mine = m.expediteur === "cliente";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  <p className="whitespace-pre-wrap">{m.contenu}</p>
                  <p className={`mt-1 text-xs ${mine ? "text-primary-foreground/70" : "text-foreground/50"}`}>
                    {m.created_at ? formatDateTime(m.created_at) : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {profile && <div className="mt-4"><Composer /></div>}
    </div>
  );
}
