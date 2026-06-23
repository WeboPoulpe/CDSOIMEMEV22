"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";
import type { Identity, Answer } from "@/components/dynamic-questionnaire-form";

const identitySchema = z.object({
  prenom: z.string().min(1, "Prénom requis"),
  nom: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  telephone: z.string().optional(),
});

export async function submitQuestionnaireAction(
  identity: Identity,
  answers: Answer[]
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireClient();
  const profile = await currentClienteProfile(session.user.id);
  if (!profile) return { error: "Profil introuvable." };
  const parsed = identitySchema.safeParse(identity);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const d = parsed.data;

  await prisma.form_responses.create({
    data: {
      client_id: profile.id,
      nom: d.nom,
      prenom: d.prenom,
      email: d.email,
      telephone: d.telephone?.trim() || null,
      answers: answers.filter((a) => a.value) as object,
    },
  });
  revalidatePath("/espace/questionnaire");
  return { ok: true };
}
