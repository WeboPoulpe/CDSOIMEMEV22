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
    // Crée automatiquement la séance correspondante (best-effort : certaines
    // prestations personnalisées peuvent ne pas correspondre aux types autorisés).
    try {
      await prisma.seances.create({
        data: { cliente_id: booking.cliente_id, type: booking.care_types.nom, date: booking.requested_date },
      });
    } catch (e) {
      console.error("⚠️ séance auto non créée:", e);
    }
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
