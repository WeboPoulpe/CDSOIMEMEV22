"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";

export async function cancelBookingAction(bookingId: string): Promise<{ error?: string }> {
  const session = await requireClient();
  const profile = await currentClienteProfile(session.user.id);
  if (!profile) return { error: "Profil introuvable." };

  const b = await prisma.booking_requests.findUnique({ where: { id: bookingId } });
  if (!b || b.cliente_id !== profile.id) return { error: "Demande introuvable." };
  if (!["pending", "confirmed"].includes(b.status)) {
    return { error: "Cette demande ne peut plus être annulée." };
  }

  await prisma.booking_requests.update({
    where: { id: bookingId },
    data: { status: "cancelled", updated_at: new Date() },
  });
  revalidatePath("/espace");
  revalidatePath("/admin/demandes");
  return {};
}
