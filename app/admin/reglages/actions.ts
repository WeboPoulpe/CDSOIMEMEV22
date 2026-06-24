"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPraticienneProfile } from "@/lib/praticienne";

type State = { error?: string; ok?: boolean } | undefined;

export async function saveSettingsAction(_prev: State, formData: FormData): Promise<State> {
  await requireAdmin();
  const p = await getPraticienneProfile();
  const s = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  await prisma.profiles.update({
    where: { id: p.id },
    data: {
      nom_praticienne: s("nom_praticienne") ?? "Charline",
      forme_juridique: s("forme_juridique"),
      siret: s("siret"),
      adresse_entreprise: s("adresse_entreprise"),
      telephone: s("telephone"),
      email: s("email"),
      photo_profil: s("photo_profil"),
      logo_praticienne: s("logo_praticienne"),
    },
  });
  revalidatePath("/admin/reglages");
  revalidatePath("/legal/mentions-legales");
  revalidatePath("/");
  return { ok: true };
}
