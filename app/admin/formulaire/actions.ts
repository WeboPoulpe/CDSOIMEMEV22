"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { saveQuestionnaire, type QDef } from "@/lib/questionnaire";

export async function saveQuestionnaireAction(def: QDef): Promise<{ error?: string }> {
  await requireAdmin();
  if (!def.fields?.length) return { error: "Ajoute au moins une question." };
  if (def.fields.some((f) => !f.label.trim())) return { error: "Chaque question doit avoir un intitulé." };
  await saveQuestionnaire(def);
  revalidatePath("/admin/formulaire");
  revalidatePath("/espace/questionnaire");
  return {};
}
