import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PrestationsPage() {
  await requireAdmin();
  const prestations = await prisma.care_types.findMany({
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Prestations</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {prestations.map((p) => (
          <Card key={p.id} className="rounded-lg">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <CardTitle className="text-base">{p.nom}</CardTitle>
              {!p.actif && <Badge variant="outline">Inactive</Badge>}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {p.description && <p className="text-foreground/65">{p.description}</p>}
              <div className="flex gap-4 text-foreground/70">
                <span>{p.duree_minutes ?? 60} min</span>
                <span>{formatPrice(p.prix)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
