"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function sendPraticienneMessageAction(
  clienteId: string,
  contenu: string
): Promise<{ error?: string }> {
  await requireAdmin();
  const text = contenu.trim();
  if (!text) return { error: "Message vide." };
  await prisma.messages.create({
    data: { cliente_id: clienteId, contenu: text, expediteur: "praticienne", lu: false },
  });
  revalidatePath(`/admin/clientes/${clienteId}`);
  return {};
}
