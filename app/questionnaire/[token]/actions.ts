"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  prenom: z.string().min(1, "Prénom requis"),
  nom: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  telephone: z.string().optional(),
  date_naissance: z.string().optional(),
  raison_rdv: z.string().optional(),
  objectif: z.string().optional(),
  causes: z.string().optional(),
  consequences: z.string().optional(),
  obstacles: z.string().optional(),
  ressources: z.string().optional(),
  besoins: z.string().optional(),
  echeance: z.string().optional(),
});

export type PublicQuestionnaireInput = z.infer<typeof schema>;

export async function submitPublicQuestionnaireAction(
  token: string,
  input: PublicQuestionnaireInput
): Promise<{ ok?: boolean; error?: string }> {
  const profile = await prisma.profiles.findFirst({ where: { account_token: token } });
  if (!profile || !profile.token_expiration || profile.token_expiration.getTime() < Date.now()) {
    return { error: "Ce lien est invalide ou a expiré." };
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const d = parsed.data;
  const blank = (s?: string) => (s && s.trim() ? s.trim() : null);

  await prisma.form_responses.create({
    data: {
      client_id: profile.id,
      nom: d.nom,
      prenom: d.prenom,
      email: d.email,
      telephone: blank(d.telephone),
      date_naissance: blank(d.date_naissance),
      raison_rdv: blank(d.raison_rdv),
      objectif: blank(d.objectif),
      causes: blank(d.causes),
      consequences: blank(d.consequences),
      obstacles: blank(d.obstacles),
      ressources: blank(d.ressources),
      besoins: blank(d.besoins),
      echeance: blank(d.echeance),
    },
  });
  // One-time link: consume the token.
  await prisma.profiles.update({ where: { id: profile.id }, data: { account_token: null, token_expiration: null } });
  return { ok: true };
}
