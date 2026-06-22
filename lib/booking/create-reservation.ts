import type { Reservation } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeTotalCents } from "@/lib/booking/pricing";
import { slotForUnit } from "@/lib/booking/slots";
import { SlotUnavailableError } from "@/lib/booking/errors";
import type { ReservationInput } from "@/lib/booking/schema";

export async function createReservation(
  input: ReservationInput
): Promise<{ reservation: Reservation; autoConfirmed: boolean }> {
  const resource = await prisma.resource.findUnique({
    where: { id: input.resourceId },
    include: { pricings: { include: { tiers: true } } },
  });
  if (!resource || !resource.active) {
    throw new Error("Espace introuvable ou indisponible.");
  }

  const pricing = resource.pricings.find((p) => p.unit === input.unit);
  if (!pricing) throw new Error("Cette unité de réservation n'est pas tarifée.");

  // SECURITY/CORRECTNESS: Re-derive the canonical slot server-side from the
  // client-supplied startAt date, ignoring the client's endAt entirely.
  // This prevents malformed inputs (e.g. a DAY booking with endAt at 23:00,
  // or an overnight range) from evading the overlap/capacity check by
  // producing a non-canonical window. All storage, pricing, and conflict
  // detection use the server-computed canonical boundaries exclusively.
  const h = input.startAt.getHours();
  const slot = slotForUnit(input.unit, input.startAt, {
    half: h >= 14 ? "PM" : "AM",
    hour: h,
  });

  const totalCents = computeTotalCents({
    unit: input.unit,
    priceCents: pricing.priceCents,
    startAt: slot.startAt,
    endAt: slot.endAt,
    tiers: pricing.tiers.map((t) => ({ minQuantity: t.minQuantity, priceCents: t.priceCents })),
  });

  const autoConfirmed = !resource.requiresValidation;
  const initialStatus = autoConfirmed ? "CONFIRMED" : "PENDING";

  const reservation = await prisma.$transaction(async (tx) => {
    // Serialize concurrent bookings for THIS resource: lock the resource row so a
    // competing transaction blocks until we commit, then sees our insert in the
    // capacity count below. Prevents the READ COMMITTED count-then-insert race.
    await tx.$executeRaw`SELECT id FROM "Resource" WHERE id = ${resource.id} FOR UPDATE`;

    // Check for overlapping closed periods
    const closed = await tx.closedPeriod.count({
      where: {
        startAt: { lt: slot.endAt },
        endAt: { gt: slot.startAt },
      },
    });
    if (closed > 0) throw new SlotUnavailableError("Le lieu est fermé sur ce créneau.");

    // Capacity check: count active reservations overlapping the canonical slot
    const activeCount = await tx.reservation.count({
      where: {
        resourceId: resource.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { lt: slot.endAt },
        endAt: { gt: slot.startAt },
      },
    });
    if (activeCount >= resource.capacity) {
      throw new SlotUnavailableError();
    }

    return tx.reservation.create({
      data: {
        resourceId: resource.id,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone || null,
        company: input.company || null,
        message: input.message || null,
        startAt: slot.startAt,
        endAt: slot.endAt,
        unit: input.unit,
        totalCents,
        status: initialStatus,
      },
    });
  });

  return { reservation, autoConfirmed };
}
