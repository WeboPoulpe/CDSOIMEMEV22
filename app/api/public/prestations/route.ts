import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CORS_HEADERS } from "@/lib/public-booking";

export const dynamic = "force-dynamic";

export async function GET() {
  const list = await prisma.care_types.findMany({
    where: { actif: true },
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    select: { id: true, nom: true, description: true, duree_minutes: true, prix: true },
  });
  const data = list.map((c) => ({
    id: c.id,
    nom: c.nom,
    description: c.description,
    dureeMinutes: c.duree_minutes,
    prix: c.prix != null ? Number(c.prix) : null,
  }));
  return NextResponse.json({ prestations: data }, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}
