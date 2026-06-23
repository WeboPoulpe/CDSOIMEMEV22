"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SEANCE_TYPES } from "@/lib/constants";

function refreshPlanning() {
  revalidatePath("/admin/calendrier");
  revalidatePath("/admin/seances");
  revalidatePath("/admin");
}

export async function createSeanceAction(input: {
  clienteId: string;
  type: string;
  dateTime: string;
  lieu?: string;
  notes?: string;
}): Promise<{ error?: string }> {
  await requireAdmin();
  if (!input.clienteId) return { error: "Choisis une cliente." };
  if (!(SEANCE_TYPES as readonly string[]).includes(input.type)) return { error: "Type de séance invalide." };
  const date = new Date(input.dateTime);
  if (isNaN(date.getTime())) return { error: "Date et heure invalides." };
  await prisma.seances.create({
    data: {
      cliente_id: input.clienteId,
      type: input.type,
      date,
      lieu: input.lieu?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
  refreshPlanning();
  return {};
}

export async function deleteSeanceAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.seances.delete({ where: { id } });
  refreshPlanning();
  return {};
}

export async function createPersonalSlotAction(input: {
  title: string;
  start: string;
  end: string;
}): Promise<{ error?: string }> {
  await requireAdmin();
  if (!input.title.trim()) return { error: "Donne un titre (ex. Coiffeur)." };
  const start = new Date(input.start);
  const end = new Date(input.end);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return { error: "L'heure de fin doit suivre l'heure de début." };
  }
  await prisma.personal_slots.create({
    data: { title: input.title.trim(), start_datetime: start, end_datetime: end },
  });
  revalidatePath("/admin/calendrier");
  return {};
}

export async function deletePersonalSlotAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.personal_slots.delete({ where: { id } });
  revalidatePath("/admin/calendrier");
  return {};
}
