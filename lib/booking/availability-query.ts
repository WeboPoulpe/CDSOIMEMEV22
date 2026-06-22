import { prisma } from "@/lib/db";

/**
 * Display helper to surface remaining spots in the UI.
 * Returns the number of available slots for a resource over a time span.
 * Indicative only; the guarantee remains the transaction.
 * Not yet wired into V1 booking flow.
 */
export async function remainingCapacity(
  resourceId: string,
  capacity: number,
  startAt: Date,
  endAt: Date
): Promise<number> {
  // ClosedPeriod is intentionally venue-wide / global (no resourceId column).
  // Closures apply to the whole venue by design, per spec "indispo globale".
  const closed = await prisma.closedPeriod.count({
    where: { startAt: { lt: endAt }, endAt: { gt: startAt } },
  });
  if (closed > 0) return 0;
  const active = await prisma.reservation.count({
    where: {
      resourceId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });
  return Math.max(0, capacity - active);
}
