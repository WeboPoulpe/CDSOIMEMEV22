import { prisma } from "@/lib/db";

export async function getActiveMantra(): Promise<string | null> {
  const m = await prisma.mantras.findFirst({ where: { actif: true }, orderBy: { created_at: "desc" } });
  return m?.contenu ?? null;
}

export async function setMantra(contenu: string): Promise<void> {
  await prisma.mantras.updateMany({ where: { actif: true }, data: { actif: false } });
  const text = contenu.trim();
  if (text) await prisma.mantras.create({ data: { contenu: text, actif: true } });
}
