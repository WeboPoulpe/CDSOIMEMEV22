"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { saveTemoignages, type Temoignage } from "@/lib/temoignages";

export async function saveTemoignagesAction(list: Temoignage[]): Promise<{ error?: string }> {
  await requireAdmin();
  await saveTemoignages(list);
  revalidatePath("/");
  revalidatePath("/admin/reglages");
  return {};
}
