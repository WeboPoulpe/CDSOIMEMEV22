import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminHome() {
  await requireAdmin();

  const now = new Date();
  const [clientesCount, seancesAVenir, prestationsCount] = await Promise.all([
    prisma.profiles.count(),
    prisma.seances.count({ where: { date: { gte: now } } }),
    prisma.care_types.count({ where: { actif: true } }),
  ]);

  const cards = [
    { label: "Clientes", value: clientesCount },
    { label: "Séances à venir", value: seancesAVenir },
    { label: "Prestations", value: prestationsCount },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Bienvenue ✨</h1>
        <p className="text-foreground/60">Votre espace de soin et d'accompagnement.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-sm text-foreground/60">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Prochaines étapes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground/60">
            La gestion des clientes, des séances et des documents arrive dans les prochaines
            tranches.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
