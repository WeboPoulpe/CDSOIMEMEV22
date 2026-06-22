import { describe, it, expect, beforeEach } from "vitest";
import { getCalendarService } from "@/lib/integrations/calendar";

describe("getCalendarService", () => {
  beforeEach(() => {
    process.env.DEMO_MODE = "true";
  });

  it("returns simulated service in demo mode", async () => {
    const svc = getCalendarService();
    const res = await svc.createEvent({
      summary: "Test",
      startAt: new Date(),
      endAt: new Date(Date.now() + 3600000),
    });
    expect(res.simulated).toBe(true);
  });
});
