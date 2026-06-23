import { prisma } from "@/lib/db";
import { BookingFlow } from "./booking-flow";

export const dynamic = "force-dynamic";

export default async function PublicReserverPage() {
  const rows = await prisma.care_types.findMany({
    where: { actif: true },
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    select: { id: true, nom: true, description: true, duree_minutes: true, prix: true, image_url: true },
  });
  const prestations = rows.map((p) => ({
    id: p.id,
    nom: p.nom,
    description: p.description,
    dureeMinutes: p.duree_minutes,
    prix: p.prix != null ? Number(p.prix) : null,
    imageUrl: p.image_url,
  }));

  return <BookingFlow prestations={prestations} />;
}
