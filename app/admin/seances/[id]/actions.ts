"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SEANCE_TYPES } from "@/lib/constants";
import { getEmailService, seanceSummaryHtml } from "@/lib/integrations/email";
import { rdvDateLabel } from "@/lib/notifications";

export async function updateSeanceAction(id: string, formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const type = String(formData.get("type") || "");
  if (!(SEANCE_TYPES as readonly string[]).includes(type)) return { error: "Type invalide." };
  const date = new Date(String(formData.get("date") || ""));
  if (isNaN(date.getTime())) return { error: "Date invalide." };
  await prisma.seances.update({
    where: { id },
    data: {
      type,
      date,
      lieu: String(formData.get("lieu") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
      exercices: String(formData.get("exercices") || "").trim() || null,
      updated_at: new Date(),
    },
  });
  revalidatePath(`/admin/seances/${id}`);
  revalidatePath("/admin/seances");
  return {};
}

export async function deleteSeanceDetailAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.seances.delete({ where: { id } });
  revalidatePath("/admin/seances");
  return {};
}

export async function sendSeanceSummaryAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const s = await prisma.seances.findUnique({ where: { id }, include: { profiles: true } });
  if (!s) return { error: "Séance introuvable." };
  const email = s.profiles?.email || s.email_externe;
  if (!email) return { error: "Pas d'email pour cette cliente." };
  const clientName = [s.profiles?.prenom, s.profiles?.nom].filter(Boolean).join(" ") || s.nom_externe || "";

  try {
    const mail = getEmailService({ fromEmail: process.env.AUTH_EMAIL_FROM?.trim() || "cdsoimeme@gmail.com", fromName: "CD soi-même" });
    await mail.send({
      to: email,
      toName: clientName || undefined,
      subject: "Le récap de ta séance — CD soi-même",
      html: seanceSummaryHtml({ businessName: "CD soi-même", clientName, type: s.type, dateLabel: rdvDateLabel(s.date), notes: s.notes, exercices: s.exercices }),
    });
  } catch (e) {
    console.error("⚠️ email récap séance:", e);
    return { error: "Envoi impossible." };
  }
  await prisma.seances.update({ where: { id }, data: { statut_envoi: "envoye" } });
  revalidatePath(`/admin/seances/${id}`);
  return {};
}
