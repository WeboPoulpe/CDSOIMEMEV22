import { describe, it, expect } from "vitest";
import { computeAvailableSlots, hmToMin, minToHm } from "@/lib/availability";

describe("hm/min conversions", () => {
  it("round-trips", () => {
    expect(hmToMin("09:30")).toBe(570);
    expect(minToHm(570)).toBe("09:30");
    expect(minToHm(600)).toBe("10:00");
  });
});

describe("computeAvailableSlots", () => {
  it("fills an open window at the step", () => {
    const s = computeAvailableSlots({ openStart: 540, openEnd: 720, durationMin: 60, stepMin: 60 });
    expect(s.map(minToHm)).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("skips the lunch break", () => {
    const s = computeAvailableSlots({
      openStart: 540, openEnd: 1080, durationMin: 60, stepMin: 60,
      lunchStart: 720, lunchEnd: 840,
    });
    expect(s.map(minToHm)).toEqual(["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]);
  });

  it("removes slots overlapping a busy interval", () => {
    const s = computeAvailableSlots({
      openStart: 540, openEnd: 720, durationMin: 60, stepMin: 60,
      busy: [{ start: 600, end: 660 }], // 10:00–11:00 taken
    });
    expect(s.map(minToHm)).toEqual(["09:00", "11:00"]);
  });

  it("excludes slots before notBeforeMin", () => {
    const s = computeAvailableSlots({
      openStart: 540, openEnd: 720, durationMin: 60, stepMin: 60,
      notBeforeMin: 600,
    });
    expect(s.map(minToHm)).toEqual(["10:00", "11:00"]);
  });

  it("does not place a slot that would run past closing", () => {
    const s = computeAvailableSlots({ openStart: 540, openEnd: 630, durationMin: 60, stepMin: 30 });
    expect(s.map(minToHm)).toEqual(["09:00", "09:30"]); // last 9:30–10:30 fits, 10:00 would exceed
  });
});
