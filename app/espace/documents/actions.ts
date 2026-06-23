"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";

export async function uploadClientDocumentAction(formData: FormData): Promise<{ error?: string }> {
  const session = await requireClient();
  const profile = await currentClienteProfile(session.user.id);
  if (!profile) return { error: "Profil introuvable." };

  const file = formData.get("file");
  const titre = String(formData.get("titre") || "").trim();
  if (!(file instanceof File) || file.size === 0) return { error: "Choisis un fichier." };
  if (file.size > 12 * 1024 * 1024) return { error: "Fichier trop lourd (max 12 Mo)." };
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { error: "Le dépôt de fichiers n'est pas encore activé." };

  let url: string;
  try {
    const blob = await put(`documents/${profile.id}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    url = blob.url;
  } catch (e) {
    console.error("⚠️ upload blob cliente:", e);
    return { error: "Envoi du fichier impossible." };
  }

  await prisma.documents.create({
    data: { cliente_id: profile.id, titre: titre || file.name, url, categorie: "Déposé par la cliente", partage_client: true },
  });
  revalidatePath("/espace/documents");
  revalidatePath(`/admin/clientes/${profile.id}`);
  return {};
}
