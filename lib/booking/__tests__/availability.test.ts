import { describe, it, expect } from "vitest";
import { overlaps, isSlotAvailable } from "@/lib/booking/availability";

const d = (s: string) => new Date(s);

describe("overlaps", () => {
  it("true when ranges intersect", () => {
    expect(overlaps(
      { startAt: d("2026-06-17T10:00"), endAt: d("2026-06-17T12:00") },
      { startAt: d("2026-06-17T11:00"), endAt: d("2026-06-17T13:00") }
    )).toBe(true);
  });
  it("false when ranges only touch at the boundary", () => {
    expect(overlaps(
      { startAt: d("2026-06-17T10:00"), endAt: d("2026-06-17T12:00") },
      { startAt: d("2026-06-17T12:00"), endAt: d("2026-06-17T14:00") }
    )).toBe(false);
  });
  it("false when ranges are disjoint", () => {
    expect(overlaps(
      { startAt: d("2026-06-17T10:00"), endAt: d("2026-06-17T11:00") },
      { startAt: d("2026-06-17T13:00"), endAt: d("2026-06-17T14:00") }
    )).toBe(false);
  });
});

describe("isSlotAvailable", () => {
  it("available when active count below capacity", () => {
    expect(isSlotAvailable({ capacity: 8, activeCount: 3, closed: false })).toBe(true);
  });
  it("unavailable when at capacity", () => {
    expect(isSlotAvailable({ capacity: 1, activeCount: 1, closed: false })).toBe(false);
  });
  it("unavailable when closed regardless of capacity", () => {
    expect(isSlotAvailable({ capacity: 8, activeCount: 0, closed: true })).toBe(false);
  });
});
