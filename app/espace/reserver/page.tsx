import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ReserveForm } from "./reserve-form";

export default async function ReserverPage() {
  await requireClient();
  const prestations = await prisma.care_types.findMany({
    where: { actif: true },
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    select: { id: true, nom: true, duree_minutes: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Prendre rendez-vous</h1>
        <p className="text-foreground/60">
          Choisissez une prestation et un créneau ; votre praticienne confirmera la séance.
        </p>
      </div>
      {prestations.length === 0 ? (
        <p className="text-foreground/50">Aucune prestation disponible pour le moment.</p>
      ) : (
        <ReserveForm prestations={prestations} />
      )}
    </div>
  );
}
