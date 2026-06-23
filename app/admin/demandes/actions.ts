"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clienteName } from "@/lib/display";
import { notifyBookingConfirmed } from "@/lib/notifications";

export async function confirmBookingAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    const booking = await prisma.booking_requests.update({
      where: { id },
      data: { status: "confirmed", updated_at: new Date() },
      include: { profiles: true, care_types: true },
    });
    if (booking.profiles.email) {
      await notifyBookingConfirmed({
        clientEmail: booking.profiles.email,
        clientName: clienteName(booking.profiles),
        prestation: booking.care_types.nom,
        date: booking.requested_date,
      });
    }
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
