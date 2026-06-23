"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

function refresh() {
  revalidatePath("/admin/horaires");
  revalidatePath("/reserver");
}

export async function updateDayAction(input: {
  day: number;
  isOpen: boolean;
  start: string;
  end: string;
  lunchStart?: string;
  lunchEnd?: string;
}): Promise<{ error?: string }> {
  await requireAdmin();
  if (input.day < 0 || input.day > 6) return { error: "Jour invalide." };
  const ls = input.lunchStart?.trim() || null;
  const le = input.lunchEnd?.trim() || null;
  if ((ls && !le) || (!ls && le)) return { error: "Indique le début ET la fin de la pause." };
  try {
    await prisma.$executeRaw`
      UPDATE opening_hours
      SET is_open = ${input.isOpen},
          start_time = ${input.start}::time,
          end_time = ${input.end}::time,
          lunch_break_start = ${ls}::time,
          lunch_break_end = ${le}::time,
          updated_at = now()
      WHERE day_of_week = ${input.day}`;
    refresh();
    return {};
  } catch {
    return { error: "Enregistrement impossible (vérifie les heures)." };
  }
}

export async function addClosureAction(input: { start: string; end: string; reason?: string }): Promise<{ error?: string }> {
  await requireAdmin();
  if (!input.start || !input.end) return { error: "Choisis les dates." };
  if (input.end < input.start) return { error: "La date de fin doit suivre la date de début." };
  await prisma.closure_periods.create({
    data: { start_date: new Date(`${input.start}T12:00:00`), end_date: new Date(`${input.end}T12:00:00`), reason: input.reason?.trim() || null },
  });
  refresh();
  return {};
}

export async function deleteClosureAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.closure_periods.delete({ where: { id } });
  refresh();
  return {};
}
