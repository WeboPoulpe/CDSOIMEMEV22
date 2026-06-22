import { describe, it, expect } from "vitest";
import { slotForUnit } from "@/lib/booking/slots";

describe("slotForUnit", () => {
  it("DAY spans 09:00 to 18:00", () => {
    const s = slotForUnit("DAY", new Date("2026-06-17T00:00"));
    expect(s.startAt.getHours()).toBe(9);
    expect(s.endAt.getHours()).toBe(18);
  });
  it("HALF_DAY AM spans 09:00 to 13:00", () => {
    const s = slotForUnit("HALF_DAY", new Date("2026-06-17T00:00"), { half: "AM" });
    expect(s.startAt.getHours()).toBe(9);
    expect(s.endAt.getHours()).toBe(13);
  });
  it("HALF_DAY PM spans 14:00 to 18:00", () => {
    const s = slotForUnit("HALF_DAY", new Date("2026-06-17T00:00"), { half: "PM" });
    expect(s.startAt.getHours()).toBe(14);
    expect(s.endAt.getHours()).toBe(18);
  });
  it("HOUR spans one hour from given hour", () => {
    const s = slotForUnit("HOUR", new Date("2026-06-17T00:00"), { hour: 10 });
    expect(s.startAt.getHours()).toBe(10);
    expect(s.endAt.getHours()).toBe(11);
  });
  it("MONTH spans first of month to first of next month", () => {
    const s = slotForUnit("MONTH", new Date("2026-06-17T00:00"));
    expect(s.startAt.getDate()).toBe(1);
    expect(s.startAt.getMonth()).toBe(5); // juin = 5
    expect(s.endAt.getMonth()).toBe(6);   // juillet = 6
  });
});
