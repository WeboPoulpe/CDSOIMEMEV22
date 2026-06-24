import { prisma } from "@/lib/db";

export type Temoignage = { quote: string; name: string };

const KEY = "temoignages";

export async function getTemoignages(): Promise<Temoignage[]> {
  const row = await prisma.app_settings.findUnique({ where: { key: KEY } });
  const v = row?.value;
  if (!Array.isArray(v)) return [];
  return (v as Array<Partial<Temoignage>>).map((t) => ({ quote: String(t.quote ?? ""), name: String(t.name ?? "") }));
}

export async function saveTemoignages(list: Temoignage[]): Promise<void> {
  const clean = list.filter((t) => t.quote?.trim());
  await prisma.app_settings.upsert({
    where: { key: KEY },
    create: { key: KEY, value: clean as object, updated_at: new Date() },
    update: { value: clean as object, updated_at: new Date() },
  });
}
