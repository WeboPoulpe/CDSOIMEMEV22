import { prisma } from "@/lib/db";

export type Forfait = { nom: string; description: string; prix: string; nbSeances: string };

const KEY = "forfaits";

export async function getForfaits(): Promise<Forfait[]> {
  const row = await prisma.app_settings.findUnique({ where: { key: KEY } });
  const v = row?.value;
  if (!Array.isArray(v)) return [];
  return (v as Array<Partial<Forfait>>).map((f) => ({
    nom: String(f.nom ?? ""),
    description: String(f.description ?? ""),
    prix: String(f.prix ?? ""),
    nbSeances: String(f.nbSeances ?? ""),
  }));
}

export async function saveForfaits(list: Forfait[]): Promise<void> {
  const clean = list.filter((f) => f.nom?.trim());
  await prisma.app_settings.upsert({
    where: { key: KEY },
    create: { key: KEY, value: clean as object, updated_at: new Date() },
    update: { value: clean as object, updated_at: new Date() },
  });
}
