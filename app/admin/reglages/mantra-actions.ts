"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { setMantra } from "@/lib/mantra";

export async function setMantraAction(contenu: string): Promise<{ error?: string }> {
  await requireAdmin();
  await setMantra(contenu);
  revalidatePath("/espace");
  return {};
}
