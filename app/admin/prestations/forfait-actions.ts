"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { saveForfaits, type Forfait } from "@/lib/forfaits";

export async function saveForfaitsAction(list: Forfait[]): Promise<{ error?: string }> {
  await requireAdmin();
  await saveForfaits(list);
  revalidatePath("/admin/prestations");
  revalidatePath("/");
  return {};
}
