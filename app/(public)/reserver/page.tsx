import { prisma } from "@/lib/db";
import { PublicReserveForm } from "./public-reserve-form";

export const dynamic = "force-dynamic";

export default async function PublicReserverPage() {
  const prestations = await prisma.care_types.findMany({
    where: { actif: true },
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    select: { id: true, nom: true, duree_minutes: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="font-display text-3xl">Prendre rendez-vous</h1>
        <p className="mt-2 text-foreground/65">
          Choisissez votre prestation et un créneau. Vous serez recontactée pour confirmer.
        </p>
      </div>
      {prestations.length === 0 ? (
        <p className="text-center text-foreground/50">Aucune prestation disponible pour le moment.</p>
      ) : (
        <PublicReserveForm
          prestations={prestations.map((p) => ({ id: p.id, nom: p.nom, dureeMinutes: p.duree_minutes }))}
        />
      )}
    </div>
  );
}
