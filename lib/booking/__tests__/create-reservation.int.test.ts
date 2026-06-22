import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createReservation } from "@/lib/booking/create-reservation";
import { SlotUnavailableError } from "@/lib/booking/errors";

// ────────────────────────────────────────────────────────────────────────────
// Test suite 1: anti-double-booking (capacity 1)
// ────────────────────────────────────────────────────────────────────────────

let resourceId: string;
// AM half-day 7 days from now (canonical: 09:00–13:00)
const start = new Date(Date.now() + 7 * 86_400_000);
start.setHours(9, 0, 0, 0);
const end = new Date(start.getTime() + 4 * 3_600_000); // 13:00

describe("createReservation anti-double-booking", () => {
  beforeAll(async () => {
    const r = await prisma.resource.create({
      data: {
        slug: `test-cap1-${Date.now()}`,
        name: "Test Cap1",
        type: "MEETING_ROOM",
        capacity: 1,
        requiresValidation: true,
        pricings: { create: [{ unit: "HALF_DAY", priceCents: 1000 }] },
      },
    });
    resourceId = r.id;
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { resourceId } });
    await prisma.pricing.deleteMany({ where: { resourceId } });
    await prisma.resource.delete({ where: { id: resourceId } });
  });

  it("allows the first booking then blocks the overlapping one", async () => {
    const base = {
      resourceId,
      unit: "HALF_DAY" as const,
      startAt: start,
      endAt: end,
      customerName: "Client A",
      customerEmail: "a@x.fr",
    };
    const first = await createReservation(base);
    expect(first.reservation.status).toBe("PENDING");
    expect(first.autoConfirmed).toBe(false);

    await expect(
      createReservation({ ...base, customerName: "Client B", customerEmail: "b@x.fr" })
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Test suite 2: server-side slot re-derivation
// Verifies that a non-canonical client input (DAY, startAt 09:00, endAt 23:00)
// is normalised to the canonical DAY slot (09:00–18:00) before persistence.
// ────────────────────────────────────────────────────────────────────────────

let resourceId2: string;

describe("createReservation server-side re-derivation", () => {
  beforeAll(async () => {
    const r = await prisma.resource.create({
      data: {
        slug: `test-rederive-${Date.now()}`,
        name: "Test ReDerive",
        type: "MEETING_ROOM",
        capacity: 1,
        requiresValidation: false,
        pricings: { create: [{ unit: "DAY", priceCents: 5000 }] },
      },
    });
    resourceId2 = r.id;
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { resourceId: resourceId2 } });
    await prisma.pricing.deleteMany({ where: { resourceId: resourceId2 } });
    await prisma.resource.delete({ where: { id: resourceId2 } });
    await prisma.$disconnect();
  });

  it("overrides a bogus endAt 23:00 with canonical endAt 18:00 for DAY unit", async () => {
    // Client supplies a non-canonical window: 09:00 → 23:00 (would span day boundary)
    const startAt = new Date(Date.now() + 14 * 86_400_000);
    startAt.setHours(9, 0, 0, 0);
    const bogusEndAt = new Date(startAt);
    bogusEndAt.setHours(23, 0, 0, 0); // deliberately non-canonical

    const result = await createReservation({
      resourceId: resourceId2,
      unit: "DAY",
      startAt,
      endAt: bogusEndAt,
      customerName: "Client Canonique",
      customerEmail: "canon@x.fr",
    });

    // The persisted endAt must be the canonical 18:00, not the client's 23:00
    expect(result.reservation.endAt.getHours()).toBe(18);
    expect(result.autoConfirmed).toBe(true);
    expect(result.reservation.status).toBe("CONFIRMED");
  });
});
