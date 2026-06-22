import { describe, it, expect } from "vitest";
import { formatEuros, formatDateRange } from "@/lib/utils";

describe("formatEuros", () => {
  it("formats cents to euros with comma decimal", () => {
    expect(formatEuros(12500).replace(/ | /g, " ")).toBe("125,00 €");
  });
  it("formats zero", () => {
    expect(formatEuros(0).replace(/ | /g, " ")).toBe("0,00 €");
  });
  it("formats single cent values", () => {
    expect(formatEuros(5).replace(/ | /g, " ")).toBe("0,05 €");
  });
});

describe("formatDateRange", () => {
  it("formats same-day range with hours", () => {
    const start = new Date("2026-06-17T14:00:00");
    const end = new Date("2026-06-17T18:00:00");
    const result = formatDateRange(start, end);
    expect(result).toContain("17");
    expect(result).toContain("14:00");
    expect(result).toContain("18:00");
  });
});
