"use server";

import { randomBytes } from "crypto";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SEANCE_TYPES } from "@/lib/constants";
import { getEmailService, questionnaireInviteHtml } from "@/lib/integrations/email";

export async function addSeanceAction(
  clienteId: string,
  input: { type: string; date: string; lieu?: string; notes?: string }
): Promise<{ error?: string }> {
  await requireAdmin();
  if (!(SEANCE_TYPES as readonly string[]).includes(input.type)) {
    return { error: "Type de séance invalide." };
  }
  const date = new Date(input.date);
  if (isNaN(date.getTime())) return { error: "Date invalide." };
  await prisma.seances.create({
    data: {
      cliente_id: clienteId,
      type: input.type,
      date,
      lieu: input.lieu?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath("/admin/seances");
  return {};
}

export async function addDocumentAction(
  clienteId: string,
  input: { titre: string; url: string; categorie?: string }
): Promise<{ error?: string }> {
  await requireAdmin();
  if (!input.titre.trim()) return { error: "Titre requis." };
  if (!/^https?:\/\//i.test(input.url.trim())) return { error: "URL invalide (http/https)." };
  await prisma.documents.create({
    data: {
      cliente_id: clienteId,
      titre: input.titre.trim(),
      url: input.url.trim(),
      categorie: input.categorie?.trim() || null,
      partage_client: true,
    },
  });
  revalidatePath(`/admin/clientes/${clienteId}`);
  return {};
}

export async function uploadDocumentAction(clienteId: string, formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const file = formData.get("file");
  const titre = String(formData.get("titre") || "").trim();
  const categorie = String(formData.get("categorie") || "").trim();
  if (!(file instanceof File) || file.size === 0) return { error: "Choisis un fichier." };
  if (file.size > 12 * 1024 * 1024) return { error: "Fichier trop lourd (max 12 Mo)." };
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { error: "Stockage non configuré — renseigne BLOB_READ_WRITE_TOKEN (Vercel Blob)." };
  }
  let url: string;
  try {
    const blob = await put(`documents/${clienteId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    url = blob.url;
  } catch (e) {
    console.error("⚠️ upload blob:", e);
    return { error: "Envoi du fichier impossible." };
  }
  await prisma.documents.create({
    data: { cliente_id: clienteId, titre: titre || file.name, url, categorie: categorie || null, partage_client: true },
  });
  revalidatePath(`/admin/clientes/${clienteId}`);
  return {};
}

export async function sendQuestionnaireAction(
  clienteId: string
): Promise<{ error?: string; demoLink?: string }> {
  await requireAdmin();
  const cliente = await prisma.profiles.findUnique({ where: { id: clienteId } });
  if (!cliente) return { error: "Cliente introuvable." };
  if (!cliente.email) return { error: "Ajoute d'abord un email à cette cliente." };

  const token = randomBytes(24).toString("hex");
  await prisma.profiles.update({
    where: { id: clienteId },
    data: { account_token: token, token_expiration: new Date(Date.now() + 14 * 24 * 3600 * 1000) },
  });

  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const url = `${base.replace(/\/$/, "")}/questionnaire/${token}`;
  try {
    const mail = getEmailService({ fromEmail: process.env.AUTH_EMAIL_FROM?.trim() || "cdsoimeme@gmail.com", fromName: "CD soi-même" });
    await mail.send({
      to: cliente.email,
      toName: [cliente.prenom, cliente.nom].filter(Boolean).join(" ") || undefined,
      subject: "Ton questionnaire — CD soi-même",
      html: questionnaireInviteHtml({ businessName: "CD soi-même", url, name: cliente.prenom ?? "" }),
    });
  } catch (e) {
    console.error("⚠️ email questionnaire:", e);
  }

  revalidatePath(`/admin/clientes/${clienteId}`);
  return { demoLink: process.env.DEMO_MODE === "true" ? url : undefined };
}
