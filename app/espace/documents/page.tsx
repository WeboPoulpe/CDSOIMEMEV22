import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";
import { PageHeader, SectionCard, EmptyState } from "@/components/admin/ui";

export default async function EspaceDocumentsPage() {
  const session = await requireClient();
  const profile = await currentClienteProfile(session.user.id);

  const documents = profile
    ? await prisma.documents.findMany({
        where: { cliente_id: profile.id, partage_client: true },
        orderBy: { created_at: "desc" },
      })
    : [];

  return (
    <div>
      <PageHeader title="Mes documents" subtitle={`${documents.length} document(s) partagé(s)`} />
      <SectionCard>
        <div className="space-y-2">
          {documents.length === 0 && <EmptyState>Aucun document partagé pour le moment.</EmptyState>}
          {documents.map((d) => (
            <a
              key={d.id}
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3 transition-colors hover:bg-muted"
            >
              <div>
                <p className="font-medium text-foreground">{d.titre}</p>
                {d.categorie && <p className="text-sm text-foreground/55">{d.categorie}</p>}
              </div>
              <span className="text-sm text-primary">Ouvrir →</span>
            </a>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
