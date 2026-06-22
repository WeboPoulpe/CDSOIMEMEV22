"use client";

import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { fr },
});

export const CALENDAR_PALETTE = ["#B4502E", "#7C8B6B", "#9C6B3E", "#52796F", "#A14A76"];

export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceIndex: number;
  status: string;
};

export function CalendarView({ events }: { events: CalEvent[] }) {
  return (
    <div className="h-[70vh] rounded-lg bg-card p-2">
      <Calendar
        localizer={localizer}
        events={events}
        defaultView={Views.MONTH}
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        culture="fr"
        messages={{
          month: "Mois",
          week: "Semaine",
          day: "Jour",
          today: "Aujourd'hui",
          previous: "‹",
          next: "›",
        }}
        eventPropGetter={(evt: CalEvent) => ({
          style: {
            backgroundColor: CALENDAR_PALETTE[evt.resourceIndex % CALENDAR_PALETTE.length],
            opacity: evt.status === "PENDING" ? 0.55 : 1,
            border: evt.status === "PENDING" ? "1px dashed #1F1B16" : "none",
          },
        })}
      />
    </div>
  );
}
