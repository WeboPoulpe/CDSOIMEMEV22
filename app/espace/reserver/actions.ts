"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";

export async function createBookingRequestAction(input: {
  careTypeId: string;
  requestedDate: string; // ISO from <input type="datetime-local">
  notes?: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const session = await requireClient();
  const profile = await currentClienteProfile(session.user.id);
  if (!profile) return { error: "Profil introuvable." };

  const care = await prisma.care_types.findFirst({
    where: { id: input.careTypeId, actif: true },
  });
  if (!care) return { error: "Prestation invalide." };

  const date = new Date(input.requestedDate);
  if (isNaN(date.getTime())) return { error: "Date invalide." };
  if (date.getTime() < Date.now()) return { error: "Choisissez une date à venir." };

  await prisma.booking_requests.create({
    data: {
      cliente_id: profile.id,
      care_type_id: care.id,
      requested_date: date,
      status: "pending",
      notes: input.notes?.trim() || null,
    },
  });
  revalidatePath("/espace");
  revalidatePath("/admin/demandes");
  return { ok: true };
}
