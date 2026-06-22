"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function confirmBookingAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await prisma.booking_requests.update({
      where: { id },
      data: { status: "confirmed", updated_at: new Date() },
    });
    revalidatePath("/admin/demandes");
    revalidatePath("/admin");
    return {};
  } catch {
    return { error: "Validation impossible." };
  }
}

export async function refuseBookingAction(id: string, reason: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await prisma.booking_requests.update({
      where: { id },
      data: { status: "refused", refusal_reason: reason || null, updated_at: new Date() },
    });
    revalidatePath("/admin/demandes");
    return {};
  } catch {
    return { error: "Refus impossible." };
  }
}
