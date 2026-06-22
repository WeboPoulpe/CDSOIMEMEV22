"use server";

import { createPublicBooking, type PublicBookingInput } from "@/lib/public-booking";

export async function submitPublicBookingAction(
  input: PublicBookingInput
): Promise<{ ok?: boolean; error?: string }> {
  const res = await createPublicBooking(input);
  return res.ok ? { ok: true } : { error: res.error };
}
