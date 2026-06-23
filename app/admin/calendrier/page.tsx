import Link from "next/link";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
  startOfMonth, startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clienteName } from "@/lib/display";
import { PageHeader } from "@/components/admin/ui";
import { DayPlanner } from "./day-planner";

type Ev = { time: string; label: string; kind: "seance" | "rdv" | "perso"; sort: number };
const KIND_CLASS: Record<Ev["kind"], string> = {
  seance: "bg-primary/12 text-primary",
  rdv: "bg-secondary/15 text-secondary",
  perso: "bg-[#C9A24B]/18 text-[#A8842F]",
};

export const dynamic = "force-dynamic";

export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; d?: string }>;
}) {
  await requireAdmin();
  const { m, d } = await searchParams;

  const cursor = startOfMonth(m && /^\d{4}-\d{2}$/.test(m) ? new Date(`${m}-01T12:00:00`) : new Date());
  const month = format(cursor, "yyyy-MM");
  const gridStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const today = new Date();
  const selectedDay =
    d && /^\d{4}-\d{2}-\d{2}$/.test(d)
      ? d
      : isSameMonth(today, cursor)
        ? format(today, "yyyy-MM-dd")
        : format(cursor, "yyyy-MM-dd");

  const [seances, rdv, perso, clientesRows] = await Promise.all([
    prisma.seances.findMany({ where: { date: { gte: gridStart, lte: gridEnd } }, include: { profiles: true } }),
    prisma.booking_requests.findMany({
      where: { requested_date: { gte: gridStart, lte: gridEnd }, status: "confirmed" },
      include: { profiles: true, care_types: true },
    }),
    prisma.personal_slots.findMany({ where: { start_datetime: { lte: gridEnd }, end_datetime: { gte: gridStart } } }),
    prisma.profiles.findMany({ orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
  ]);

  // Month grid pills
  const byDay = new Map<string, Ev[]>();
  const push = (date: Date, ev: Ev) => {
    const k = format(date, "yyyy-MM-dd");
    const arr = byDay.get(k) ?? [];
    arr.push(ev);
    byDay.set(k, arr);
  };
  const whoSeance = (s: (typeof seances)[number]) =>
    clienteName(s.profiles) !== "—" ? clienteName(s.profiles) : (s.nom_externe ?? "Séance");
  for (const s of seances) push(s.date, { time: format(s.date, "HH:mm"), label: whoSeance(s), kind: "seance", sort: s.date.getHours() * 60 + s.date.getMinutes() });
  for (const r of rdv) push(r.requested_date, { time: format(r.requested_date, "HH:mm"), label: clienteName(r.profiles), kind: "rdv", sort: r.requested_date.getHours() * 60 + r.requested_date.getMinutes() });
  for (const p of perso) push(p.start_datetime, { time: format(p.start_datetime, "HH:mm"), label: p.title, kind: "perso", sort: p.start_datetime.getHours() * 60 + p.start_datetime.getMinutes() });
  for (const arr of byDay.values()) arr.sort((a, b) => a.sort - b.sort);

  // Selected day detail (with ids for management)
  const onDay = (date: Date) => format(date, "yyyy-MM-dd") === selectedDay;
  const daySeances = seances.filter((s) => onDay(s.date)).map((s) => ({ id: s.id, type: s.type, time: format(s.date, "HH:mm"), who: whoSeance(s) }));
  const dayRdv = rdv.filter((r) => onDay(r.requested_date)).map((r) => ({ id: r.id, time: format(r.requested_date, "HH:mm"), who: clienteName(r.profiles), presta: r.care_types.nom }));
  const dayPerso = perso.filter((p) => onDay(p.start_datetime)).map((p) => ({ id: p.id, title: p.title, time: `${format(p.start_datetime, "HH:mm")}–${format(p.end_datetime, "HH:mm")}` }));
  const clientes = clientesRows.map((c) => ({ id: c.id, name: clienteName(c) }));

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const prev = format(addMonths(cursor, -1), "yyyy-MM");
  const next = format(addMonths(cursor, 1), "yyyy-MM");

  return (
    <div>
      <PageHeader
        title="Planning"
        subtitle="Clique sur un jour pour voir et organiser ta journée"
        action={
          <div className="flex items-center gap-2">
            <Link href={`/admin/calendrier?m=${prev}`} className="grid h-9 w-9 place-items-center rounded-full border border-primary/15 text-foreground/60 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></Link>
            <span className="min-w-[10rem] text-center font-serif text-lg capitalize">{format(cursor, "MMMM yyyy", { locale: fr })}</span>
            <Link href={`/admin/calendrier?m=${next}`} className="grid h-9 w-9 place-items-center rounded-full border border-primary/15 text-foreground/60 hover:bg-muted"><ChevronRight className="h-4 w-4" /></Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-4 text-xs text-foreground/55">
        <Legend className="bg-primary" label="Séance" />
        <Legend className="bg-secondary" label="RDV confirmé" />
        <Legend className="bg-[#C9A24B]" label="Perso" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-primary/10 bg-card/70 backdrop-blur-sm">
        <div className="grid grid-cols-7 border-b border-primary/10 text-center text-xs font-medium text-foreground/45">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((dd) => <div key={dd} className="py-2.5">{dd}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const k = format(day, "yyyy-MM-dd");
            const evs = byDay.get(k) ?? [];
            const out = !isSameMonth(day, cursor);
            const isToday = isSameDay(day, today);
            const isSel = k === selectedDay;
            return (
              <Link
                key={k}
                href={`/admin/calendrier?m=${month}&d=${k}`}
                className={`min-h-[6.5rem] border-b border-r border-primary/8 p-1.5 transition-colors hover:bg-muted/40 ${out ? "bg-muted/20" : ""} ${isSel ? "ring-2 ring-inset ring-primary/40" : ""}`}
              >
                <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-primary font-medium text-primary-foreground" : out ? "text-foreground/30" : "text-foreground/60"}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {evs.slice(0, 3).map((e, i) => (
                    <div key={i} className={`truncate rounded-md px-1.5 py-0.5 text-[11px] leading-tight ${KIND_CLASS[e.kind]}`}>
                      <span className="font-medium">{e.time}</span> {e.label}
                    </div>
                  ))}
                  {evs.length > 3 && <div className="px-1.5 text-[11px] text-foreground/45">+{evs.length - 3}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <DayPlanner
        date={selectedDay}
        dateLabel={format(new Date(`${selectedDay}T12:00:00`), "EEEE d MMMM", { locale: fr })}
        clientes={clientes}
        seances={daySeances}
        rdv={dayRdv}
        perso={dayPerso}
      />
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
