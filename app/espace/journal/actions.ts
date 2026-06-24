"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";

export async function addJournalAction(contenu: string, partage: boolean): Promise<{ error?: string }> {
  const session = await requireClient();
  const profile = await currentClienteProfile(session.user.id);
  if (!profile) return { error: "Profil introuvable." };
  if (!contenu.trim()) return { error: "Note vide." };
  await prisma.client_journal.create({
    data: { cliente_id: profile.id, contenu: contenu.trim(), partage_praticienne: partage },
  });
  revalidatePath("/espace/journal");
  return {};
}

export async function deleteJournalAction(id: string): Promise<{ error?: string }> {
  const session = await requireClient();
  const profile = await currentClienteProfile(session.user.id);
  if (!profile) return { error: "Profil introuvable." };
  const entry = await prisma.client_journal.findUnique({ where: { id } });
  if (!entry || entry.cliente_id !== profile.id) return { error: "Entrée introuvable." };
  await prisma.client_journal.delete({ where: { id } });
  revalidatePath("/espace/journal");
  return {};
}
