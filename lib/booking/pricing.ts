import type { BookingUnit } from "@prisma/client";

const MS_HOUR = 1000 * 60 * 60;

export type PriceTier = { minQuantity: number; priceCents: number };

/** Number of billable units (hours / half-days / days / months) in a slot. */
export function quantityForUnit(unit: BookingUnit, startAt: Date, endAt: Date): number {
  const ms = endAt.getTime() - startAt.getTime();
  if (ms <= 0) throw new Error("Plage horaire invalide");
  switch (unit) {
    case "HOUR":
      return Math.ceil(ms / MS_HOUR);
    case "HALF_DAY":
      return Math.ceil(ms / (MS_HOUR * 4));
    case "DAY":
      return Math.max(1, Math.ceil(ms / (MS_HOUR * 24)));
    case "MONTH":
      return Math.max(
        1,
        (endAt.getFullYear() - startAt.getFullYear()) * 12 +
          (endAt.getMonth() - startAt.getMonth())
      );
    default:
      throw new Error(`Unité inconnue: ${unit}`);
  }
}

/**
 * Degressive (tiered) per-unit price: the applicable tier is the one with the
 * highest `minQuantity` that is still <= the booked quantity. Below the lowest
 * tier — or with no tiers — the base price applies.
 */
export function unitPriceForQuantity(
  basePriceCents: number,
  tiers: PriceTier[] | undefined,
  quantity: number
): number {
  if (!tiers || tiers.length === 0) return basePriceCents;
  const applicable = tiers
    .filter((t) => quantity >= t.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];
  return applicable ? applicable.priceCents : basePriceCents;
}

export function computeTotalCents(input: {
  unit: BookingUnit;
  priceCents: number;
  startAt: Date;
  endAt: Date;
  tiers?: PriceTier[];
}): number {
  const { unit, priceCents, startAt, endAt, tiers } = input;
  if (priceCents == null) throw new Error("Unité non tarifée");
  const quantity = quantityForUnit(unit, startAt, endAt);
  const unitPrice = unitPriceForQuantity(priceCents, tiers, quantity);
  return unitPrice * quantity;
}
