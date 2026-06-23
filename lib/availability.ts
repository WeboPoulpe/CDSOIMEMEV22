import { prisma } from "@/lib/db";

export type Interval = { start: number; end: number }; // minutes from midnight

export function hmToMin(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

export function minToHm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Pure slot generator. Returns the start minutes of every slot of length
 * `durationMin` that fits inside [openStart, openEnd], avoids the lunch break
 * and any busy interval, and starts no earlier than `notBeforeMin`.
 */
export function computeAvailableSlots(opts: {
  openStart: number;
  openEnd: number;
  lunchStart?: number | null;
  lunchEnd?: number | null;
  durationMin: number;
  stepMin?: number;
  busy?: Interval[];
  notBeforeMin?: number | null;
}): number[] {
  const step = opts.stepMin ?? 30;
  const blocks: Interval[] = [...(opts.busy ?? [])];
  if (opts.lunchStart != null && opts.lunchEnd != null) {
    blocks.push({ start: opts.lunchStart, end: opts.lunchEnd });
  }
  const out: number[] = [];
  for (let s = opts.openStart; s + opts.durationMin <= opts.openEnd; s += step) {
    const e = s + opts.durationMin;
    if (opts.notBeforeMin != null && s < opts.notBeforeMin) continue;
    const overlaps = blocks.some((b) => s < b.end && e > b.start);
    if (!overlaps) out.push(s);
  }
  return out;
}

/** Available "HH:MM" start times for a prestation on a given local date. */
export async function getAvailableSlots(careTypeId: string, dateStr: string): Promise<string[]> {
  const care = await prisma.care_types.findFirst({ where: { id: careTypeId, actif: true } });
  if (!care) return [];
  const durationMin = care.duree_minutes ?? 60;

  const dayNoon = new Date(`${dateStr}T12:00:00`);
  if (isNaN(dayNoon.getTime())) return [];
  const dow = dayNoon.getDay(); // 0=Dim … 6=Sam (heure locale serveur = Europe/Paris)

  const oh = await prisma.$queryRaw<
    Array<{ is_open: boolean; s: string; e: string; ls: string | null; le: string | null }>
  >`SELECT is_open, to_char(start_time,'HH24:MI') s, to_char(end_time,'HH24:MI') e,
           to_char(lunch_break_start,'HH24:MI') ls, to_char(lunch_break_end,'HH24:MI') le
    FROM opening_hours WHERE day_of_week = ${dow} LIMIT 1`;
  const day = oh[0];
  if (!day || !day.is_open) return [];

  const closed = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT count(*) n FROM closure_periods WHERE ${dateStr}::date BETWEEN start_date AND end_date`;
  if (Number(closed[0]?.n ?? 0) > 0) return [];

  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59`);
  const [seances, bookings, pslots] = await Promise.all([
    prisma.seances.findMany({ where: { date: { gte: dayStart, lte: dayEnd } }, select: { date: true } }),
    prisma.booking_requests.findMany({
      where: { requested_date: { gte: dayStart, lte: dayEnd }, status: { in: ["pending", "confirmed"] } },
      select: { requested_date: true },
    }),
    prisma.personal_slots.findMany({
      where: { start_datetime: { lte: dayEnd }, end_datetime: { gte: dayStart } },
      select: { start_datetime: true, end_datetime: true },
    }),
  ]);

  const minOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
  const busy: Interval[] = [];
  for (const s of seances) busy.push({ start: minOf(s.date), end: minOf(s.date) + durationMin });
  for (const b of bookings) busy.push({ start: minOf(b.requested_date), end: minOf(b.requested_date) + durationMin });
  for (const p of pslots) busy.push({ start: Math.max(0, minOf(p.start_datetime)), end: Math.min(1440, minOf(p.end_datetime)) });

  const now = new Date();
  const isToday = now.toDateString() === dayNoon.toDateString();
  const notBeforeMin = isToday ? now.getHours() * 60 + now.getMinutes() + 60 : null; // 1h de battement

  const slots = computeAvailableSlots({
    openStart: hmToMin(day.s),
    openEnd: hmToMin(day.e),
    lunchStart: day.ls ? hmToMin(day.ls) : null,
    lunchEnd: day.le ? hmToMin(day.le) : null,
    durationMin,
    stepMin: 30,
    busy,
    notBeforeMin,
  });
  return slots.map(minToHm);
}
