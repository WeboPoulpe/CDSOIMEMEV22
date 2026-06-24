"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function addNoteAction(
  clienteId: string,
  input: { contenu: string; ressentis?: string; axes?: string }
): Promise<{ error?: string }> {
  await requireAdmin();
  if (!input.contenu.trim()) return { error: "Note vide." };
  await prisma.private_notes.create({
    data: {
      cliente_id: clienteId,
      type: "session",
      contenu: input.contenu.trim(),
      ressentis: input.ressentis?.trim() || null,
      axes_explorer: input.axes?.trim() || null,
    },
  });
  revalidatePath(`/admin/clientes/${clienteId}`);
  return {};
}

export async function deleteNoteAction(id: string, clienteId: string): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.private_notes.delete({ where: { id } });
  revalidatePath(`/admin/clientes/${clienteId}`);
  return {};
}
