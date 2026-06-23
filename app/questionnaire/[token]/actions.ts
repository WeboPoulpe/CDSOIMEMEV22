"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Identity, Answer } from "@/components/dynamic-questionnaire-form";

const identitySchema = z.object({
  prenom: z.string().min(1, "Prénom requis"),
  nom: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  telephone: z.string().optional(),
});

export async function submitPublicQuestionnaireAction(
  token: string,
  identity: Identity,
  answers: Answer[]
): Promise<{ ok?: boolean; error?: string }> {
  const profile = await prisma.profiles.findFirst({ where: { account_token: token } });
  if (!profile || !profile.token_expiration || profile.token_expiration.getTime() < Date.now()) {
    return { error: "Ce lien est invalide ou a expiré." };
  }
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
  await prisma.profiles.update({ where: { id: profile.id }, data: { account_token: null, token_expiration: null } });
  return { ok: true };
}
