"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createReservationsPublicAction,
  checkAvailabilityAction,
  type Availability,
} from "@/app/(public)/actions";
import { slotForUnit } from "@/lib/booking/slots";
import {
  computeTotalCents,
  quantityForUnit,
  unitPriceForQuantity,
} from "@/lib/booking/pricing";
import { formatEuros } from "@/lib/utils";
import {
  AvailabilityCalendar,
  slotKey,
  type CalendarSelection,
} from "@/components/public/availability-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BookingUnit } from "@prisma/client";

type Tier = { minQuantity: number; priceCents: number };
type PricingOpt = { unit: string; priceCents: number; label: string | null; tiers?: Tier[] };

function slotLabel(s: CalendarSelection, unit: string, hour: number) {
  if (unit === "MONTH") return s.date.slice(0, 7);
  if (unit === "HALF_DAY")
    return `${s.date} · ${s.half === "PM" ? "14h-18h" : "9h-13h"}`;
  if (unit === "HOUR") return `${s.date} · ${hour}h-${hour + 1}h`;
  return `${s.date} · journée`;
}

export function BookingForm({
  resourceId,
  pricings,
}: {
  resourceId: string;
  pricings: PricingOpt[];
}) {
  const router = useRouter();
  const [unit, setUnit] = useState(pricings[0]?.unit ?? "DAY");
  const [multiDate, setMultiDate] = useState(false);
  const [selected, setSelected] = useState<CalendarSelection[]>([]);
  const [month, setMonth] = useState("");
  const [hour, setHour] = useState(9);
  const [customer, setCustomer] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    company: "",
    message: "",
  });
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedPricing = pricings.find((p) => p.unit === unit);
  const selectedPrice = selectedPricing?.priceCents ?? 0;
  const selectedKeys = useMemo(() => selected.map(slotKey), [selected]);

  // Slot objects for the current selection (used for total + availability).
  const slots = useMemo(
    () =>
      selected.map((s) =>
        slotForUnit(unit as BookingUnit, new Date(`${s.date}T00:00`), {
          half: s.half ?? "AM",
          hour,
        })
      ),
    [selected, unit, hour]
  );

  const total = slots.reduce(
    (sum, slot) =>
      sum +
      computeTotalCents({
        unit: unit as BookingUnit,
        priceCents: selectedPrice,
        startAt: slot.startAt,
        endAt: slot.endAt,
        tiers: selectedPricing?.tiers,
      }),
    0
  );
  const firstSlot = slots[0];
  const degressive =
    !!firstSlot &&
    unitPriceForQuantity(
      selectedPrice,
      selectedPricing?.tiers,
      quantityForUnit(unit as BookingUnit, firstSlot.startAt, firstSlot.endAt)
    ) < selectedPrice;

  // Live availability — only meaningful for a single chosen slot.
  const [avail, setAvail] = useState<Availability | null>(null);
  const [checking, startCheck] = useTransition();
  const singleSlotKey = !multiDate && slots.length === 1 ? slots[0].startAt.toISOString() : "";

  useEffect(() => {
    if (!singleSlotKey) {
      setAvail(null);
      return;
    }
    let cancelled = false;
    setAvail(null);
    startCheck(async () => {
      const res = await checkAvailabilityAction({ resourceId, unit, startAt: singleSlotKey });
      if (!cancelled && !("error" in res)) setAvail(res);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleSlotKey, unit, resourceId]);

  const isFull = avail !== null && !avail.available;

  function pick(sel: CalendarSelection) {
    setSelected([sel]); // single mode: replace
  }
  function toggle(sel: CalendarSelection) {
    const k = slotKey(sel);
    setSelected((prev) =>
      prev.some((s) => slotKey(s) === k) ? prev.filter((s) => slotKey(s) !== k) : [...prev, sel]
    );
  }
  function addMonth() {
    if (!month) return;
    const sel: CalendarSelection = { date: `${month}-01`, half: null };
    const k = slotKey(sel);
    setSelected((prev) =>
      multiDate
        ? prev.some((s) => slotKey(s) === k)
          ? prev
          : [...prev, sel]
        : [sel]
    );
    setMonth("");
  }
  function changeUnit(u: string) {
    setUnit(u);
    setSelected([]);
    setMonth("");
  }
  function toggleMulti(on: boolean) {
    setMultiDate(on);
    setSelected([]); // reset to avoid mixed state
  }

  function submit() {
    setError(null);
    if (!selected.length) {
      setError("Sélectionnez au moins une date.");
      return;
    }
    startSubmit(async () => {
      const res = await createReservationsPublicAction({
        resourceId,
        unit,
        slots: selected.map((s) => ({
          date: s.date,
          half: unit === "HALF_DAY" ? s.half : null,
          hour: unit === "HOUR" ? hour : undefined,
        })),
        ...customer,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      if (res.failed > 0) {
        toast(`${res.failed} créneau(x) indisponible(s) ignoré(s).`);
      }
      router.push(
        `/reserver/confirmation?ids=${res.ids.join(",")}&auto=${res.autoConfirmed ? "1" : "0"}`
      );
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Formule</Label>
        <div className="flex flex-wrap gap-2">
          {pricings.map((p) => (
            <button
              key={p.unit}
              type="button"
              onClick={() => changeUnit(p.unit)}
              className={`rounded-lg border px-3 py-2 text-sm ${unit === p.unit ? "border-primary bg-primary/10" : "border-muted"}`}
            >
              {p.label ?? p.unit} · {formatEuros(p.priceCents)}
              {p.tiers && p.tiers.length > 0 && (
                <span className="ml-1 text-xs text-secondary">· dégressif</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={multiDate} onChange={(e) => toggleMulti(e.target.checked)} />
        Réserver plusieurs dates
      </label>

      <div className="space-y-2">
        <Label>{unit === "MONTH" ? "Mois" : multiDate ? "Dates (sélection multiple)" : "Date"}</Label>
        {unit === "MONTH" ? (
          <div className="flex items-end gap-2">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            <Button type="button" variant="outline" onClick={addMonth}>
              {multiDate ? "Ajouter" : "Choisir"}
            </Button>
          </div>
        ) : (
          <AvailabilityCalendar
            resourceId={resourceId}
            unit={unit}
            multiple={multiDate}
            selected={!multiDate ? selected[0] ?? null : null}
            onSelect={pick}
            selectedKeys={selectedKeys}
            onToggle={toggle}
          />
        )}
      </div>

      {unit === "HOUR" && selected.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="hour">Heure de début{multiDate ? " (toutes les dates)" : ""}</Label>
          <select
            id="hour"
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="w-full rounded-lg border border-muted px-3 py-2"
          >
            {Array.from({ length: 9 }, (_, i) => i + 9).map((h) => (
              <option key={h} value={h}>
                {h}h00 – {h + 1}h00
              </option>
            ))}
          </select>
        </div>
      )}

      {multiDate && selected.length > 0 && (
        <div className="rounded-lg border border-border/60 p-3 text-sm">
          <p className="mb-1 font-medium">Créneaux sélectionnés ({selected.length})</p>
          <ul className="space-y-1">
            {selected.map((s) => {
              const k = slotKey(s);
              return (
                <li key={k} className="flex items-center justify-between rounded-md bg-muted px-2 py-1">
                  <span>{slotLabel(s, unit, hour)}</span>
                  <button
                    type="button"
                    className="text-destructive"
                    onClick={() => setSelected((prev) => prev.filter((x) => slotKey(x) !== k))}
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerName">Nom complet</Label>
          <Input id="customerName" value={customer.customerName} onChange={(e) => setCustomer({ ...customer, customerName: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerEmail">Email</Label>
          <Input id="customerEmail" type="email" value={customer.customerEmail} onChange={(e) => setCustomer({ ...customer, customerEmail: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Téléphone</Label>
          <Input id="customerPhone" value={customer.customerPhone} onChange={(e) => setCustomer({ ...customer, customerPhone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Société (optionnel)</Label>
          <Input id="company" value={customer.company} onChange={(e) => setCustomer({ ...customer, company: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message (optionnel)</Label>
        <Textarea id="message" rows={3} value={customer.message} onChange={(e) => setCustomer({ ...customer, message: e.target.value })} />
      </div>

      {selected.length > 0 && (
        <div className="space-y-1.5 rounded-lg bg-muted p-4 text-sm">
          <p>
            Total estimé{multiDate ? ` (${selected.length} créneaux)` : ""} :{" "}
            <span className="font-semibold">{formatEuros(total)}</span>
          </p>
          {degressive && (
            <p className="text-xs text-secondary">Tarif dégressif appliqué.</p>
          )}
          {!multiDate && checking && (
            <p className="text-muted-foreground">Vérification de la disponibilité…</p>
          )}
          {!multiDate &&
            !checking &&
            avail &&
            (avail.available ? (
              <p className="font-medium text-secondary">
                {avail.capacity > 1
                  ? `Disponible · ${avail.remaining} place(s) restante(s)`
                  : "Créneau disponible"}
              </p>
            ) : (
              <p className="font-medium text-destructive">
                Ce créneau est déjà réservé — choisissez-en un autre.
              </p>
            ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={submit}
        className="w-full"
        disabled={submitting || selected.length === 0 || (!multiDate && (checking || isFull))}
      >
        {submitting
          ? "Envoi…"
          : !multiDate && isFull
            ? "Créneau indisponible"
            : multiDate && selected.length > 1
              ? `Envoyer ma demande (${selected.length} créneaux)`
              : "Envoyer ma demande"}
      </Button>
    </div>
  );
}
