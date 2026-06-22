import type { BookingUnit } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeTotalCents } from "@/lib/booking/pricing";
import { slotForUnit } from "@/lib/booking/slots";
import { SlotUnavailableError } from "@/lib/booking/errors";

export type AdminSlot = { date: string; half: "AM" | "PM" | null; hour?: number };
export type AdminCustomer = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
};

/**
 * Admin multi-date entry: create several CONFIRMED reservations for one client
 * in a single pass. Each slot is re-derived to its canonical window and booked
 * in its own locked transaction (same anti-double-booking guarantee as the
 * public flow). Conflicting slots are skipped and reported, never aborting the
 * rest. No confirmation email/contract is sent — the manager is recording known
 * bookings, not triggering the customer workflow.
 */
export async function createReservationsBatch(args: {
  resourceId: string;
  unit: BookingUnit;
  slots: AdminSlot[];
  customer: AdminCustomer;
  paid?: boolean;
}): Promise<{ created: number; failed: { label: string; reason: string }[]; createdIds: string[] }> {
  const resource = await prisma.resource.findUnique({
    where: { id: args.resourceId },
    include: { pricings: { include: { tiers: true } } },
  });
  if (!resource) throw new Error("Espace introuvable.");
  const pricing = resource.pricings.find((p) => p.unit === args.unit);
  if (!pricing) throw new Error("Cette unité de réservation n'est pas tarifée.");
  const tiers = pricing.tiers.map((t) => ({ minQuantity: t.minQuantity, priceCents: t.priceCents }));

  let created = 0;
  const failed: { label: string; reason: string }[] = [];
  const createdIds: string[] = [];

  for (const s of args.slots) {
    const base = new Date(`${s.date}T00:00`);
    const slot = slotForUnit(args.unit, base, {
      half: s.half ?? (args.unit === "HALF_DAY" ? "AM" : undefined),
      hour: s.hour,
    });
    const label =
      `${s.date}` +
      (s.half ? (s.half === "AM" ? " (matin)" : " (après-midi)") : "") +
      (args.unit === "HOUR" && s.hour != null ? ` ${s.hour}h` : "");

    const totalCents = computeTotalCents({
      unit: args.unit,
      priceCents: pricing.priceCents,
      startAt: slot.startAt,
      endAt: slot.endAt,
      tiers,
    });

    try {
      const reservation = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Resource" WHERE id = ${resource.id} FOR UPDATE`;
        const closed = await tx.closedPeriod.count({
          where: { startAt: { lt: slot.endAt }, endAt: { gt: slot.startAt } },
        });
        if (closed > 0) throw new SlotUnavailableError("Le lieu est fermé sur ce créneau.");
        const active = await tx.reservation.count({
          where: {
            resourceId: resource.id,
            status: { in: ["PENDING", "CONFIRMED"] },
            startAt: { lt: slot.endAt },
            endAt: { gt: slot.startAt },
          },
        });
        if (active >= resource.capacity) throw new SlotUnavailableError();
        return tx.reservation.create({
          data: {
            resourceId: resource.id,
            customerName: args.customer.name,
            customerEmail: args.customer.email,
            customerPhone: args.customer.phone || null,
            company: args.customer.company || null,
            message: args.customer.message || null,
            startAt: slot.startAt,
            endAt: slot.endAt,
            unit: args.unit,
            totalCents,
            status: "CONFIRMED",
            paymentStatus: args.paid ? "PAID" : "UNPAID",
          },
        });
      });
      created++;
      createdIds.push(reservation.id);
    } catch (e) {
      failed.push({
        label,
        reason: e instanceof SlotUnavailableError ? e.message || "Indisponible" : "Erreur",
      });
    }
  }

  return { created, failed, createdIds };
}
