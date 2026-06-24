import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";
import { formatDateTime } from "@/lib/display";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { JournalBoard } from "./journal-board";

export const dynamic = "force-dynamic";

export default async function EspaceJournalPage() {
  const session = await requireClient();
  const profile = await currentClienteProfile(session.user.id);
  const entries = profile
    ? await prisma.client_journal.findMany({ where: { cliente_id: profile.id }, orderBy: { created_at: "desc" } })
    : [];

  return (
    <div>
      <PageHeader title="Mon journal" subtitle="Un espace à toi pour déposer ce que tu traverses." />
      <SectionCard>
        <JournalBoard
          entries={entries.map((j) => ({
            id: j.id,
            contenu: j.contenu,
            partage: !!j.partage_praticienne,
            date: formatDateTime(j.created_at),
          }))}
        />
      </SectionCard>
    </div>
  );
}
