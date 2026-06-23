"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function updateClienteStatutAction(id: string, statut: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await prisma.profiles.update({ where: { id }, data: { statut: statut.trim() || null } });
    revalidatePath("/admin/clientes");
    return {};
  } catch {
    return { error: "Mise à jour impossible." };
  }
}

export async function deleteClienteAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    const profile = await prisma.profiles.findUnique({ where: { id }, select: { auth_user_id: true } });
    // Cascade removes her séances, demandes, documents, messages, questionnaires…
    await prisma.profiles.delete({ where: { id } });
    if (profile?.auth_user_id) {
      const roles = await prisma.user_roles.findMany({
        where: { user_id: profile.auth_user_id },
        select: { role: true },
      });
      const isPraticienne = roles.some((r) => r.role === "praticienne");
      if (!isPraticienne) {
        await prisma.user_roles.deleteMany({ where: { user_id: profile.auth_user_id } });
        await prisma.auth_users.delete({ where: { id: profile.auth_user_id } }).catch(() => {});
      }
    }
    revalidatePath("/admin/clientes");
    revalidatePath("/admin");
    return {};
  } catch {
    return { error: "Suppression impossible." };
  }
}
