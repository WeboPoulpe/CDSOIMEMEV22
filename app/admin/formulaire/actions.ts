"use server";

import { randomBytes, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveQuestionnaire, type QDef } from "@/lib/questionnaire";
import { getEmailService, questionnaireInviteHtml } from "@/lib/integrations/email";

export async function saveQuestionnaireAction(def: QDef): Promise<{ error?: string }> {
  await requireAdmin();
  if (!def.fields?.length) return { error: "Ajoute au moins une question." };
  if (def.fields.some((f) => !f.label.trim())) return { error: "Chaque question doit avoir un intitulé." };
  await saveQuestionnaire(def);
  revalidatePath("/admin/formulaire");
  revalidatePath("/espace/questionnaire");
  return {};
}

/** Pre-registers a new person (creates her profile) and emails her the questionnaire link. */
export async function preregisterAndSendAction(input: {
  prenom?: string;
  nom: string;
  email: string;
}): Promise<{ error?: string; demoLink?: string }> {
  await requireAdmin();
  if (!input.nom?.trim()) return { error: "Le nom est requis." };
  const email = input.email?.trim() ?? "";
  if (!email.includes("@")) return { error: "Email invalide." };

  const token = randomBytes(24).toString("hex");
  const expiration = new Date(Date.now() + 14 * 24 * 3600 * 1000);

  let profile = await prisma.profiles.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (profile) {
    await prisma.profiles.update({ where: { id: profile.id }, data: { account_token: token, token_expiration: expiration } });
  } else {
    profile = await prisma.profiles.create({
      data: {
        id: randomUUID(),
        prenom: input.prenom?.trim() || null,
        nom: input.nom.trim(),
        email,
        statut: "Pré-inscrite",
        account_token: token,
        token_expiration: expiration,
      },
    });
  }

  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const url = `${base.replace(/\/$/, "")}/questionnaire/${token}`;
  try {
    const mail = getEmailService({ fromEmail: process.env.AUTH_EMAIL_FROM?.trim() || "cdsoimeme@gmail.com", fromName: "CD soi-même" });
    await mail.send({
      to: email,
      toName: [input.prenom, input.nom].filter(Boolean).join(" ") || undefined,
      subject: "Ton questionnaire — CD soi-même",
      html: questionnaireInviteHtml({ businessName: "CD soi-même", url, name: input.prenom ?? "" }),
    });
  } catch (e) {
    console.error("⚠️ email pré-inscription:", e);
  }

  revalidatePath("/admin/clientes");
  return { demoLink: process.env.DEMO_MODE === "true" ? url : undefined };
}
