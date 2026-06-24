import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/display";
import { getForfaits } from "@/lib/forfaits";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { CardActions } from "./card-actions";
import { ForfaitEditor } from "./forfait-editor";

export const dynamic = "force-dynamic";

export default async function PrestationsPage() {
  await requireAdmin();
  const [prestations, forfaits] = await Promise.all([
    prisma.care_types.findMany({ orderBy: [{ ordre: "asc" }, { nom: "asc" }] }),
    getForfaits(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Prestations"
        subtitle="Tes soins et accompagnements"
        action={
          <Link href="/admin/prestations/new" className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5">
            Ajouter une prestation
          </Link>
        }
      />

      {prestations.length === 0 ? (
        <p className="text-sm text-foreground/45">Aucune prestation. Crée la première.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {prestations.map((p) => (
            <div
              key={p.id}
              className={`overflow-hidden rounded-2xl border border-primary/10 bg-card/70 backdrop-blur-sm transition-colors ${p.actif ? "" : "opacity-60"}`}
            >
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.nom} className="h-36 w-full object-cover" />
              )}
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-serif text-lg text-foreground">{p.nom}</h2>
                    {!p.actif && <Badge variant="outline" className="mt-1">Inactive</Badge>}
                  </div>
                  <CardActions id={p.id} nom={p.nom} actif={p.actif ?? true} />
                </div>
                {p.description && <p className="mt-2 text-sm text-foreground/60">{p.description}</p>}
                <div className="mt-3 flex gap-4 text-sm text-foreground/70">
                  <span>{p.duree_minutes ?? 60} min</span>
                  <span className="font-medium text-primary">{formatPrice(p.prix)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionCard title="Forfaits / accompagnements">
        <p className="mb-4 text-sm text-foreground/55">Présentés sur la page d'accueil (ex. Être Soi, Transformation, à la carte).</p>
        <ForfaitEditor initial={forfaits} />
      </SectionCard>
    </div>
  );
}
