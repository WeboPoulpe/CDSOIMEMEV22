import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

/** The praticienne's singleton profile (her business identity). Created on first need. */
export async function getPraticienneProfile() {
  let p = await prisma.profiles.findFirst({
    where: { nom_praticienne: { not: null } },
    orderBy: { created_at: "asc" },
  });
  if (!p) {
    p = await prisma.profiles.create({ data: { id: randomUUID(), nom_praticienne: "Charline" } });
  }
  return p;
}
