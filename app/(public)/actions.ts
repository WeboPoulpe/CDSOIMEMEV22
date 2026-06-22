"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { BookingUnit } from "@prisma/client";
import { prisma } from "@/lib/db";
import { reservationInputSchema } from "@/lib/booking/schema";
import { createReservation } from "@/lib/booking/create-reservation";
import { slotForUnit } from "@/lib/booking/slots";
import { remainingCapacity } from "@/lib/booking/availability-query";
import { SlotUnavailableError } from "@/lib/booking/errors";
import {
  confirmReservation,
  sendRequestReceived,
  notifyNewRequest,
} from "@/lib/workflow/confirm-reservation";

export type BookingState = { error?: string } | undefined;

export type Availability = {
  available: boolean;
  remaining: number;
  capacity: number;
};

/**
 * Live availability for a chosen slot, so the client sees "free / full"
 * BEFORE submitting. Re-derives the canonical slot server-side, exactly like
 * createReservation, so the preview matches what booking will enforce.
 */
export async function checkAvailabilityAction(input: {
  resourceId: string;
  unit: string;
  startAt: string;
}): Promise<Availability | { error: string }> {
  const resource = await prisma.resource.findUnique({
    where: { id: input.resourceId },
    select: { capacity: true, active: true },
  });
  if (!resource || !resource.active) return { error: "Espace indisponible." };

  const start = new Date(input.startAt);
  if (Number.isNaN(start.getTime())) return { error: "Date invalide." };

  const h = start.getHours();
  const slot = slotForUnit(input.unit as BookingUnit, start, {
    half: h >= 14 ? "PM" : "AM",
    hour: h,
  });
  const remaining = await remainingCapacity(
    input.resourceId,
    resource.capacity,
    slot.startAt,
    slot.endAt
  );
  return { available: remaining > 0, remaining, capacity: resource.capacity };
}

export type DayAvailability = { am: boolean; pm: boolean; full: boolean };

/**
 * Per-day availability for a whole month (computed in-memory from one
 * reservations + one closed-periods query), so the public calendar can colour
 * morning/afternoon/day slots without a request per cell.
 */
export async function monthAvailabilityAction(
  resourceId: string,
  year: number,
  month: number // 0-indexed (JS)
): Promise<{ capacity: number; days: Record<number, DayAvailability> } | { error: string }> {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { capacity: true, active: true },
  });
  if (!resource || !resource.active) return { error: "Espace indisponible." };

  const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 1, 0, 0, 0, 0);

  const [reservations, closed] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        resourceId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { lt: monthEnd },
        endAt: { gt: monthStart },
      },
      select: { startAt: true, endAt: true },
    }),
    prisma.closedPeriod.findMany({
      where: { startAt: { lt: monthEnd }, endAt: { gt: monthStart } },
      select: { startAt: true, endAt: true },
    }),
  ]);

  const free = (start: Date, end: Date) => {
    if (closed.some((c) => c.startAt < end && c.endAt > start)) return false;
    const n = reservations.filter((r) => r.startAt < end && r.endAt > start).length;
    return n < resource.capacity;
  };

  const days: Record<number, DayAvailability> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const at = (d: number, h: number) => new Date(year, month, d, h, 0, 0, 0);
  for (let d = 1; d <= daysInMonth; d++) {
    days[d] = {
      am: free(at(d, 9), at(d, 13)),
      pm: free(at(d, 14), at(d, 18)),
      full: free(at(d, 9), at(d, 18)),
    };
  }
  return { capacity: resource.capacity, days };
}

/**
 * Public multi-date booking: one client, several slots. Each slot goes through
 * the same createReservation (status set by requiresValidation) + workflow.
 * Unavailable slots are skipped and counted, never aborting the rest.
 */
export async function createReservationsPublicAction(input: {
  resourceId: string;
  unit: string;
  slots: { date: string; half: "AM" | "PM" | null; hour?: number }[];
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  company?: string;
  message?: string;
}): Promise<{ ids: string[]; autoConfirmed: boolean; failed: number } | { error: string }> {
  if (!input.slots?.length) return { error: "Sélectionnez au moins une date." };
  if (input.customerName.trim().length < 2)
    return { error: "Indiquez votre nom complet." };
  if (!z.string().email().safeParse(input.customerEmail.trim()).success)
    return { error: "Adresse email invalide." };

  const ids: string[] = [];
  let failed = 0;
  let autoConfirmed = false;
  const now = Date.now();

  for (const s of input.slots) {
    const startHour =
      input.unit === "HALF_DAY"
        ? s.half === "PM"
          ? 14
          : 9
        : input.unit === "HOUR"
          ? s.hour ?? 9
          : 9;
    const startAt = new Date(`${s.date}T${String(startHour).padStart(2, "0")}:00`);
    if (startAt.getTime() <= now - 60_000) {
      failed++;
      continue;
    }
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000); // re-derived server-side

    try {
      const res = await createReservation({
        resourceId: input.resourceId,
        unit: input.unit as BookingUnit,
        startAt,
        endAt,
        customerName: input.customerName.trim(),
        customerEmail: input.customerEmail.trim(),
        customerPhone: input.customerPhone || "",
        company: input.company || "",
        message: input.message || "",
      });
      ids.push(res.reservation.id);
      autoConfirmed = res.autoConfirmed;
      try {
        if (res.autoConfirmed) {
          await confirmReservation(res.reservation.id);
        } else {
          await sendRequestReceived(res.reservation.id);
          await notifyNewRequest(res.reservation.id);
        }
      } catch (e) {
        console.error("⚠️ Workflow post-create (multi) échoué:", e);
      }
    } catch {
      failed++;
    }
  }

  if (ids.length === 0)
    return { error: "Aucun créneau disponible parmi votre sélection." };
  return { ids, autoConfirmed, failed };
}

export async function createReservationAction(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  const parsed = reservationInputSchema.safeParse({
    resourceId: formData.get("resourceId"),
    unit: formData.get("unit"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
    company: formData.get("company"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  let reservationId: string;
  let autoConfirmed: boolean;
  try {
    const res = await createReservation(parsed.data);
    reservationId = res.reservation.id;
    autoConfirmed = res.autoConfirmed;
    // Workflow runs AFTER createReservation's transaction has committed — never inside it.
    // Best-effort: a failed email must not break the user's confirmation redirect.
    try {
      if (autoConfirmed) {
        await confirmReservation(reservationId);
      } else {
        await sendRequestReceived(reservationId);
        await notifyNewRequest(reservationId);
      }
    } catch (e) {
      console.error("⚠️ Workflow post-create échoué (non bloquant):", e);
    }
  } catch (e) {
    if (e instanceof SlotUnavailableError) return { error: e.message };
    return { error: "Une erreur est survenue. Réessayez." };
  }

  redirect(`/reserver/confirmation?id=${reservationId}&auto=${autoConfirmed ? "1" : "0"}`);
}
