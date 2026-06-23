"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  nom: z.string().min(2, "Le nom est requis."),
  description: z.string().optional(),
  duree_minutes: z.coerce.number().int().min(5, "Durée trop courte.").max(600),
  prix: z.coerce.number().min(0, "Prix invalide."),
  ordre: z.coerce.number().int().min(0).default(0),
});

type State = { error?: string } | undefined;

function parse(formData: FormData) {
  return schema.safeParse({
    nom: formData.get("nom"),
    description: formData.get("description") || undefined,
    duree_minutes: formData.get("duree_minutes"),
    prix: String(formData.get("prix") ?? "").replace(",", "."),
    ordre: formData.get("ordre") || 0,
  });
}

export async function createPrestationAction(_prev: State, formData: FormData): Promise<State> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const d = parsed.data;
  await prisma.care_types.create({
    data: {
      nom: d.nom.trim(),
      description: d.description?.trim() || null,
      duree_minutes: d.duree_minutes,
      prix: d.prix,
      ordre: d.ordre,
      actif: formData.get("actif") === "on",
      image_url: String(formData.get("image_url") || "") || null,
    },
  });
  revalidatePath("/admin/prestations");
  redirect("/admin/prestations");
}

export async function updatePrestationAction(id: string, _prev: State, formData: FormData): Promise<State> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const d = parsed.data;
  await prisma.care_types.update({
    where: { id },
    data: {
      nom: d.nom.trim(),
      description: d.description?.trim() || null,
      duree_minutes: d.duree_minutes,
      prix: d.prix,
      ordre: d.ordre,
      actif: formData.get("actif") === "on",
      image_url: String(formData.get("image_url") || "") || null,
    },
  });
  revalidatePath("/admin/prestations");
  redirect("/admin/prestations");
}

export async function togglePrestationActifAction(id: string, actif: boolean): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.care_types.update({ where: { id }, data: { actif } });
  revalidatePath("/admin/prestations");
  return {};
}

export async function deletePrestationAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const used = await prisma.booking_requests.count({ where: { care_type_id: id } });
  if (used > 0) {
    return { error: "Des rendez-vous utilisent cette prestation — désactive-la plutôt que de la supprimer." };
  }
  await prisma.care_types.delete({ where: { id } });
  revalidatePath("/admin/prestations");
  return {};
}
