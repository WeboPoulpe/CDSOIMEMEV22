import type { BookingUnit } from "@prisma/client";

/**
 * Derive canonical slot times (hour, half-day, day, or month) in venue-local time.
 * Slot hours are derived using JS local-time setHours/getHours, so the deployment
 * MUST run in the venue's timezone (via TZ env var) for slot times to match the
 * venue's local calendar. NeonDB stores all timestamps as UTC regardless.
 */
export function slotForUnit(
  unit: BookingUnit,
  date: Date,
  opts?: { hour?: number; half?: "AM" | "PM" }
): { startAt: Date; endAt: Date } {
  const base = new Date(date);
  const at = (h: number) => {
    const d = new Date(base);
    d.setHours(h, 0, 0, 0);
    return d;
  };
  switch (unit) {
    case "HOUR": {
      const h = opts?.hour ?? 9;
      return { startAt: at(h), endAt: at(h + 1) };
    }
    case "HALF_DAY": {
      return opts?.half === "PM"
        ? { startAt: at(14), endAt: at(18) }
        : { startAt: at(9), endAt: at(13) };
    }
    case "DAY": {
      return { startAt: at(9), endAt: at(18) };
    }
    case "MONTH": {
      const start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 1, 0, 0, 0, 0);
      return { startAt: start, endAt: end };
    }
  }
}
