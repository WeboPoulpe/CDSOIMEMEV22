"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPraticienneProfile } from "@/lib/praticienne";

export async function addTodoAction(titre: string, dateEcheance?: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!titre.trim()) return { error: "Titre requis." };
  const prat = await getPraticienneProfile();
  await prisma.todos.create({
    data: {
      praticienne_id: prat.id,
      titre: titre.trim(),
      date_echeance: dateEcheance ? new Date(`${dateEcheance}T12:00:00`) : null,
      statut: "en_attente",
    },
  });
  revalidatePath("/admin");
  return {};
}

export async function toggleTodoAction(id: string, done: boolean): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.todos.update({ where: { id }, data: { statut: done ? "fait" : "en_attente", updated_at: new Date() } });
  revalidatePath("/admin");
  return {};
}

export async function deleteTodoAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.todos.delete({ where: { id } });
  revalidatePath("/admin");
  return {};
}
