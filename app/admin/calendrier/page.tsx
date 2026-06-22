import { prisma } from "@/lib/db";
import { CalendarView, type CalEvent, CALENDAR_PALETTE } from "./calendar-view";

export default async function CalendrierPage() {
  const resources = await prisma.resource.findMany({ orderBy: { sortOrder: "asc" } });
  const index = new Map(resources.map((r, i) => [r.id, i]));

  const reservations = await prisma.reservation.findMany({
    where: { status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
    include: { resource: true },
  });

  const events: CalEvent[] = reservations.map((r) => ({
    id: r.id,
    title: `${r.resource.name} · ${r.customerName}`,
    start: r.startAt,
    end: r.endAt,
    resourceIndex: index.get(r.resourceId) ?? 0,
    status: r.status,
  }));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Calendrier</h1>
      <div className="flex flex-wrap gap-3 text-sm">
        {resources.map((r, i) => (
          <span key={r.id} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: CALENDAR_PALETTE[i % CALENDAR_PALETTE.length] }}
            />
            {r.name}
          </span>
        ))}
        <span className="text-foreground/50">(pointillé = en attente)</span>
      </div>
      <CalendarView events={events} />
    </div>
  );
}
