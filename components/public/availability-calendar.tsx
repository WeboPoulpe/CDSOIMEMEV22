"use client";

import { useEffect, useState, useTransition } from "react";
import { monthAvailabilityAction, type DayAvailability } from "@/app/(public)/actions";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
// Half-day windows shown on the calendar (match slotForUnit).
const HALF_LABEL: Record<"AM" | "PM", string> = { AM: "9h-13h", PM: "14h-18h" };

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const mondayIndex = (jsDay: number) => (jsDay + 6) % 7;

export type CalendarSelection = { date: string; half: "AM" | "PM" | null };

/** Stable key for a selected slot, used in multi-select mode. */
export const slotKey = (s: CalendarSelection) => `${s.date}|${s.half ?? "DAY"}`;

export function AvailabilityCalendar({
  resourceId,
  unit,
  selected,
  onSelect,
  multiple = false,
  selectedKeys = [],
  onToggle,
}: {
  resourceId: string;
  unit: string; // HOUR | HALF_DAY | DAY
  selected?: CalendarSelection | null;
  onSelect?: (sel: CalendarSelection) => void;
  multiple?: boolean;
  selectedKeys?: string[];
  onToggle?: (sel: CalendarSelection) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [days, setDays] = useState<Record<number, DayAvailability>>({});
  const [loading, startLoad] = useTransition();

  useEffect(() => {
    let cancelled = false;
    startLoad(async () => {
      const res = await monthAvailabilityAction(resourceId, view.year, view.month);
      if (!cancelled && !("error" in res)) setDays(res.days);
    });
    return () => {
      cancelled = true;
    };
  }, [resourceId, view.year, view.month]);

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const leadOffset = mondayIndex(new Date(view.year, view.month, 1).getDay());
  const canGoPrev =
    view.year > today.getFullYear() ||
    (view.year === today.getFullYear() && view.month > today.getMonth());
  const isHalfDay = unit === "HALF_DAY";

  function gotoMonth(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }

  function isSel(date: string, half: "AM" | "PM" | null) {
    if (multiple) return selectedKeys.includes(slotKey({ date, half }));
    return !!selected && selected.date === date && (selected.half ?? null) === half;
  }
  function choose(date: string, half: "AM" | "PM" | null) {
    if (multiple) onToggle?.({ date, half });
    else onSelect?.({ date, half });
  }

  return (
    <div className="rounded-xl border border-border/60 p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => gotoMonth(-1)}
          disabled={!canGoPrev}
          className="rounded-md px-2 py-1 text-sm hover:bg-muted disabled:opacity-30"
          aria-label="Mois précédent"
        >
          ‹
        </button>
        <span className="font-display text-sm font-medium capitalize">
          {MONTHS[view.month]} {view.year}
        </span>
        <button
          type="button"
          onClick={() => gotoMonth(1)}
          className="rounded-md px-2 py-1 text-sm hover:bg-muted"
          aria-label="Mois suivant"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[0.65rem] text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className={`grid grid-cols-7 gap-1 ${loading ? "opacity-50" : ""}`}>
        {Array.from({ length: leadOffset }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
          const date = new Date(view.year, view.month, d);
          date.setHours(0, 0, 0, 0);
          const dateStr = iso(view.year, view.month, d);
          const past = date < today;
          const a = days[d];

          if (isHalfDay) {
            return (
              <div key={d} className="flex flex-col gap-0.5">
                <div className={`text-center text-[0.65rem] ${past ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
                  {d}
                </div>
                <Half
                  label={HALF_LABEL.AM}
                  on={!past && (a?.am ?? true)}
                  selected={isSel(dateStr, "AM")}
                  onClick={() => choose(dateStr, "AM")}
                />
                <Half
                  label={HALF_LABEL.PM}
                  on={!past && (a?.pm ?? true)}
                  selected={isSel(dateStr, "PM")}
                  onClick={() => choose(dateStr, "PM")}
                />
              </div>
            );
          }

          const dayOn = !past && (unit === "DAY" ? a?.full ?? true : true);
          return (
            <button
              key={d}
              type="button"
              disabled={past || (unit === "DAY" && !dayOn)}
              onClick={() => choose(dateStr, null)}
              className={cellClass(isSel(dateStr, null), dayOn, past)}
            >
              {d}
            </button>
          );
        })}
      </div>

      <Legend isHalfDay={isHalfDay} />
    </div>
  );
}

function Half({
  label,
  on,
  selected,
  onClick,
}: {
  label: string;
  on: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!on}
      onClick={onClick}
      className={`whitespace-nowrap rounded-[0.3rem] px-0.5 py-0.5 text-[0.58rem] font-medium leading-tight transition-colors ${
        selected
          ? "bg-primary text-primary-foreground"
          : on
            ? "bg-secondary/20 text-foreground hover:bg-secondary/35"
            : "bg-muted text-muted-foreground/50 line-through"
      }`}
    >
      {label}
    </button>
  );
}

function cellClass(selected: boolean, on: boolean, past: boolean) {
  const base = "aspect-square rounded-md text-sm transition-colors";
  if (past) return `${base} text-muted-foreground/30`;
  if (selected) return `${base} bg-primary text-primary-foreground`;
  if (!on) return `${base} bg-muted text-muted-foreground/50 line-through`;
  return `${base} hover:bg-secondary/25`;
}

function Legend({ isHalfDay }: { isHalfDay: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.65rem] text-muted-foreground">
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-secondary/30" /> Disponible
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-muted" /> Complet
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Sélectionné
      </span>
      {isHalfDay && <span>· 9h-13h = matin, 14h-18h = après-midi</span>}
    </div>
  );
}
