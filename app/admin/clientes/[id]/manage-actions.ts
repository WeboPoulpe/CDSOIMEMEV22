"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SEANCE_TYPES } from "@/lib/constants";

export async function addSeanceAction(
  clienteId: string,
  input: { type: string; date: string; lieu?: string; notes?: string }
): Promise<{ error?: string }> {
  await requireAdmin();
  if (!(SEANCE_TYPES as readonly string[]).includes(input.type)) {
    return { error: "Type de séance invalide." };
  }
  const date = new Date(input.date);
  if (isNaN(date.getTime())) return { error: "Date invalide." };
  await prisma.seances.create({
    data: {
      cliente_id: clienteId,
      type: input.type,
      date,
      lieu: input.lieu?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath("/admin/seances");
  return {};
}

export async function addDocumentAction(
  clienteId: string,
  input: { titre: string; url: string; categorie?: string }
): Promise<{ error?: string }> {
  await requireAdmin();
  if (!input.titre.trim()) return { error: "Titre requis." };
  if (!/^https?:\/\//i.test(input.url.trim())) return { error: "URL invalide (http/https)." };
  await prisma.documents.create({
    data: {
      cliente_id: clienteId,
      titre: input.titre.trim(),
      url: input.url.trim(),
      categorie: input.categorie?.trim() || null,
      partage_client: true,
    },
  });
  revalidatePath(`/admin/clientes/${clienteId}`);
  return {};
}
