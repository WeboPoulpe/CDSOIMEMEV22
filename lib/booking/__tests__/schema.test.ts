import { describe, it, expect } from "vitest";
import { reservationInputSchema } from "@/lib/booking/schema";

const future = new Date(Date.now() + 86_400_000);
const futureEnd = new Date(Date.now() + 86_400_000 + 3_600_000);

describe("reservationInputSchema", () => {
  it("accepts valid input", () => {
    const r = reservationInputSchema.safeParse({
      resourceId: "abc", unit: "HOUR", startAt: future, endAt: futureEnd,
      customerName: "Jean Dupont", customerEmail: "jean@x.fr",
    });
    expect(r.success).toBe(true);
  });
  it("rejects end before start", () => {
    const r = reservationInputSchema.safeParse({
      resourceId: "abc", unit: "HOUR", startAt: futureEnd, endAt: future,
      customerName: "Jean Dupont", customerEmail: "jean@x.fr",
    });
    expect(r.success).toBe(false);
  });
  it("rejects invalid email", () => {
    const r = reservationInputSchema.safeParse({
      resourceId: "abc", unit: "HOUR", startAt: future, endAt: futureEnd,
      customerName: "Jean Dupont", customerEmail: "pas-un-email",
    });
    expect(r.success).toBe(false);
  });
  it("rejects dates in the past", () => {
    const past = new Date(Date.now() - 86_400_000);
    const pastEnd = new Date(Date.now() - 86_400_000 + 3_600_000);
    const r = reservationInputSchema.safeParse({
      resourceId: "abc", unit: "HOUR", startAt: past, endAt: pastEnd,
      customerName: "Jean Dupont", customerEmail: "jean@x.fr",
    });
    expect(r.success).toBe(false);
  });
});
