import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { DayRow, Closures, type DayData } from "./hours-editor";

export const dynamic = "force-dynamic";

const NAMES: Record<number, string> = { 0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi" };
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function HorairesPage() {
  await requireAdmin();

  const rows = await prisma.$queryRaw<
    Array<{ day_of_week: number; is_open: boolean; s: string; e: string; ls: string | null; le: string | null }>
  >`SELECT day_of_week, is_open,
           to_char(start_time,'HH24:MI') s, to_char(end_time,'HH24:MI') e,
           to_char(lunch_break_start,'HH24:MI') ls, to_char(lunch_break_end,'HH24:MI') le
    FROM opening_hours`;
  const byDay = new Map(rows.map((r) => [r.day_of_week, r]));

  const days: DayData[] = ORDER.map((d) => {
    const r = byDay.get(d);
    return {
      day: d,
      name: NAMES[d],
      isOpen: r?.is_open ?? false,
      start: r?.s ?? "09:00",
      end: r?.e ?? "18:00",
      lunchStart: r?.ls ?? "",
      lunchEnd: r?.le ?? "",
    };
  });

  const closures = (await prisma.closure_periods.findMany({ orderBy: { start_date: "asc" } })).map((c) => ({
    id: c.id,
    start: format(c.start_date, "d MMM yyyy", { locale: fr }),
    end: format(c.end_date, "d MMM yyyy", { locale: fr }),
    reason: c.reason,
  }));

  return (
    <div>
      <PageHeader title="Horaires & disponibilités" subtitle="Ils pilotent les créneaux proposés à la réservation." />

      <div className="space-y-6">
        <SectionCard title="Horaires d'ouverture">
          <div className="space-y-2">
            {days.map((d) => <DayRow key={d.day} {...d} />)}
          </div>
        </SectionCard>

        <SectionCard title="Fermetures & congés">
          <Closures items={closures} />
        </SectionCard>
      </div>
    </div>
  );
}
