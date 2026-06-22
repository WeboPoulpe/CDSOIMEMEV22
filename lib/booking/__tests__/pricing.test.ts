import { describe, it, expect } from "vitest";
import { computeTotalCents, unitPriceForQuantity } from "@/lib/booking/pricing";

const d = (s: string) => new Date(s);

describe("computeTotalCents", () => {
  it("HOUR: prix × nb heures", () => {
    expect(computeTotalCents({ unit: "HOUR", priceCents: 3000, startAt: d("2026-06-17T10:00"), endAt: d("2026-06-17T13:00") })).toBe(9000);
  });
  it("HALF_DAY: prix × nb de tranches de 4h", () => {
    expect(computeTotalCents({ unit: "HALF_DAY", priceCents: 9000, startAt: d("2026-06-17T09:00"), endAt: d("2026-06-17T13:00") })).toBe(9000);
  });
  it("DAY: prix × nb jours", () => {
    expect(computeTotalCents({ unit: "DAY", priceCents: 2500, startAt: d("2026-06-17T09:00"), endAt: d("2026-06-17T18:00") })).toBe(2500);
  });
  it("DAY: deux jours", () => {
    expect(computeTotalCents({ unit: "DAY", priceCents: 2500, startAt: d("2026-06-17T09:00"), endAt: d("2026-06-18T18:00") })).toBe(5000);
  });
  it("MONTH: prix × nb mois", () => {
    expect(computeTotalCents({ unit: "MONTH", priceCents: 45000, startAt: d("2026-06-01T00:00"), endAt: d("2026-07-01T00:00") })).toBe(45000);
  });
  it("throws when priceCents is missing", () => {
    expect(() => computeTotalCents({ unit: "HOUR", priceCents: undefined as unknown as number, startAt: d("2026-06-17T10:00"), endAt: d("2026-06-17T11:00") })).toThrow();
  });
});

describe("unitPriceForQuantity (degressive tiers)", () => {
  const tiers = [
    { minQuantity: 5, priceCents: 8000 },
    { minQuantity: 10, priceCents: 6000 },
  ];
  it("uses base price below the lowest tier", () => {
    expect(unitPriceForQuantity(10000, tiers, 3)).toBe(10000);
  });
  it("uses base price when no tiers", () => {
    expect(unitPriceForQuantity(10000, [], 99)).toBe(10000);
    expect(unitPriceForQuantity(10000, undefined, 99)).toBe(10000);
  });
  it("picks the tier at the threshold", () => {
    expect(unitPriceForQuantity(10000, tiers, 5)).toBe(8000);
  });
  it("picks the highest applicable tier", () => {
    expect(unitPriceForQuantity(10000, tiers, 12)).toBe(6000);
  });
});

describe("computeTotalCents with tiers", () => {
  it("applies the degressive rate to the whole quantity past the threshold", () => {
    // 6 days, base 10000, tier 5+ -> 8000/day  =>  6 × 8000
    expect(
      computeTotalCents({
        unit: "DAY",
        priceCents: 10000,
        startAt: d("2026-06-01T09:00"),
        endAt: d("2026-06-06T18:00"),
        tiers: [{ minQuantity: 5, priceCents: 8000 }],
      })
    ).toBe(48000);
  });
  it("keeps base rate below the threshold", () => {
    // 3 days, tier only at 5+ -> base 10000/day => 3 × 10000
    expect(
      computeTotalCents({
        unit: "DAY",
        priceCents: 10000,
        startAt: d("2026-06-01T09:00"),
        endAt: d("2026-06-03T18:00"),
        tiers: [{ minQuantity: 5, priceCents: 8000 }],
      })
    ).toBe(30000);
  });
});
