"use server";

import { z } from "zod";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  prenom: z.string().optional(),
  nom: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  telephone: z.string().optional(),
  ville: z.string().optional(),
});

export async function createClienteAction(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = schema.safeParse({
    prenom: formData.get("prenom") || undefined,
    nom: formData.get("nom"),
    email: formData.get("email"),
    telephone: formData.get("telephone") || undefined,
    ville: formData.get("ville") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const d = parsed.data;

  const existing = await prisma.profiles.findFirst({ where: { email: d.email } });
  if (existing) return { error: "Une cliente avec cet email existe déjà." };

  const created = await prisma.profiles.create({
    data: {
      id: randomUUID(),
      prenom: d.prenom?.trim() || null,
      nom: d.nom.trim(),
      email: d.email,
      telephone: d.telephone?.trim() || null,
      ville: d.ville?.trim() || null,
      statut: "cliente",
    },
  });
  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${created.id}`);
}
