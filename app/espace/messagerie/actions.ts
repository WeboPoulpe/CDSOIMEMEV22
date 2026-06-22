"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";

export async function sendClientMessageAction(contenu: string): Promise<{ error?: string }> {
  const session = await requireClient();
  const text = contenu.trim();
  if (!text) return { error: "Message vide." };
  const profile = await currentClienteProfile(session.user.id);
  if (!profile) return { error: "Profil introuvable." };
  await prisma.messages.create({
    data: { cliente_id: profile.id, contenu: text, expediteur: "cliente", lu: false },
  });
  revalidatePath("/espace/messagerie");
  return {};
}
