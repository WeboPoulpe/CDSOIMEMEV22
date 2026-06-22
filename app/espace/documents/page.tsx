import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";
import { formatDate } from "@/lib/display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Mes documents</h1>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>{documents.length} document(s) partagé(s)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 && (
            <p className="text-foreground/50">Aucun document partagé pour le moment.</p>
          )}
          {documents.map((d) => (
            <a
              key={d.id}
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3 hover:bg-muted"
            >
              <div>
                <p className="font-medium">{d.titre}</p>
                {d.categorie && <p className="text-sm text-foreground/55">{d.categorie}</p>}
              </div>
              <span className="text-sm text-primary">Ouvrir →</span>
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
