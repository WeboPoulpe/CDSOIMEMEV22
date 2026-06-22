import type { CalendarService, CalendarEvent } from "@/lib/integrations/types";

// ───────── Simulated service (demo / missing env vars) ─────────

class SimulatedCalendarService implements CalendarService {
  async createEvent(evt: CalendarEvent) {
    console.log(
      `📅 [SIMULÉ] Event agenda → "${evt.summary}" du ${evt.startAt.toISOString()} au ${evt.endAt.toISOString()}`
    );
    return { id: `sim_evt_${Date.now()}`, simulated: true };
  }
}

// ───────── Real Google Calendar service (Service Account) ─────────
// googleapis v173.x shape:
//   const { google } = await import("googleapis")
//   new google.auth.GoogleAuth({ credentials, scopes })
//   google.calendar({ version: "v3", auth }).events.insert({ calendarId, requestBody })
//   → GaxiosResponse<Schema$Event>, result in .data
// NOTE: Keep the import lazy so the simulated path never loads googleapis.

class GoogleCalendarService implements CalendarService {
  constructor(private credentials: object, private calendarId: string) {}

  async createEvent(evt: CalendarEvent) {
    const { google } = await import("googleapis");
    const auth = new google.auth.GoogleAuth({
      credentials: this.credentials as never,
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.events.insert({
      calendarId: this.calendarId,
      requestBody: {
        summary: evt.summary,
        description: evt.description,
        start: { dateTime: evt.startAt.toISOString() },
        end: { dateTime: evt.endAt.toISOString() },
      },
    });
    return { id: res.data.id ?? `gcal_${Date.now()}`, simulated: false };
  }
}

// ───────── Selector ─────────
// Returns real service only when GOOGLE_SERVICE_ACCOUNT_JSON + GOOGLE_CALENDAR_ID
// are both present AND DEMO_MODE !== "true".
// Falls back to simulated if JSON is malformed (logs a warning, does not crash).

export function getCalendarService(): CalendarService {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  const calId = process.env.GOOGLE_CALENDAR_ID?.trim();
  const demo = process.env.DEMO_MODE === "true";

  if (!raw || !calId || demo) return new SimulatedCalendarService();

  try {
    const credentials = JSON.parse(raw);
    return new GoogleCalendarService(credentials, calId);
  } catch {
    console.warn("⚠️ GOOGLE_SERVICE_ACCOUNT_JSON invalide — fallback simulé.");
    return new SimulatedCalendarService();
  }
}
