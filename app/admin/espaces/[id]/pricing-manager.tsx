"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  upsertPricingAction,
  deletePricingAction,
  upsertPricingTierAction,
  deletePricingTierAction,
} from "@/app/admin/actions";
import { formatEuros } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tier = { id: string; minQuantity: number; priceCents: number };
type P = { id: string; unit: string; priceCents: number; label: string | null; tiers: Tier[] };

const UNIT_NOUN: Record<string, string> = {
  HOUR: "heures",
  HALF_DAY: "demi-journées",
  DAY: "jours",
  MONTH: "mois",
};

export function PricingManager({ resourceId, pricings }: { resourceId: string; pricings: P[] }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl">Grille tarifaire</h2>
        <p className="text-sm text-muted-foreground">
          Un tarif par unité, avec des paliers dégressifs optionnels (prix réduit à partir d&apos;une quantité).
        </p>
      </div>

      <ul className="space-y-3 text-sm">
        {pricings.map((p) => (
          <li key={p.id} className="rounded-lg bg-muted p-3">
            <div className="flex items-center justify-between gap-2">
              <span>
                {p.label ?? p.unit} — <span className="font-medium">{formatEuros(p.priceCents)}</span>{" "}
                <span className="text-muted-foreground">/ {p.unit}</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await deletePricingAction(p.id, resourceId);
                  router.refresh();
                  toast("Tarif supprimé.");
                }}
              >
                Supprimer
              </Button>
            </div>

            <div className="mt-2 space-y-1.5 border-l-2 border-border pl-3">
              {p.tiers.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <span>
                    dès {t.minQuantity} {UNIT_NOUN[p.unit] ?? "unités"} →{" "}
                    <span className="font-medium">{formatEuros(t.priceCents)}</span> / {p.unit}
                  </span>
                  <button
                    type="button"
                    className="text-destructive"
                    onClick={async () => {
                      await deletePricingTierAction(t.id, resourceId);
                      router.refresh();
                      toast("Palier supprimé.");
                    }}
                  >
                    Retirer
                  </button>
                </div>
              ))}
              <form
                action={async (fd) => {
                  const r = await upsertPricingTierAction(fd);
                  if (r?.error) toast.error(r.error);
                  else {
                    router.refresh();
                    toast.success("Palier enregistré.");
                  }
                }}
                className="flex flex-wrap items-end gap-2 pt-0.5"
              >
                <input type="hidden" name="pricingId" value={p.id} />
                <div>
                  <label className="block text-[0.65rem]">Dès (qté)</label>
                  <Input name="minQuantity" type="number" min={2} required className="h-8 w-20" />
                </div>
                <div>
                  <label className="block text-[0.65rem]">Prix unitaire (€)</label>
                  <Input name="priceEuros" type="number" min={0} step="0.01" required className="h-8 w-28" />
                </div>
                <Button type="submit" size="sm" variant="outline">
                  + palier
                </Button>
              </form>
            </div>
          </li>
        ))}
        {pricings.length === 0 && <li className="text-muted-foreground">Aucun tarif.</li>}
      </ul>

      <form
        action={async (fd) => {
          setPending(true);
          const r = await upsertPricingAction(fd);
          setPending(false);
          if (r?.error) toast.error(r.error);
          else {
            router.refresh();
            toast.success("Tarif enregistré.");
          }
        }}
        className="flex flex-wrap items-end gap-2 border-t border-border pt-4"
      >
        <input type="hidden" name="resourceId" value={resourceId} />
        <div>
          <label className="block text-xs">Unité</label>
          <select name="unit" className="rounded-lg border border-muted px-2 py-2">
            <option value="HOUR">Heure</option>
            <option value="HALF_DAY">Demi-journée</option>
            <option value="DAY">Journée</option>
            <option value="MONTH">Mois</option>
          </select>
        </div>
        <div>
          <label className="block text-xs">Prix (€)</label>
          <Input name="priceEuros" type="number" min={0} step="0.01" placeholder="250,00" required className="w-32" />
        </div>
        <div>
          <label className="block text-xs">Libellé</label>
          <Input name="label" className="w-40" />
        </div>
        <Button type="submit" disabled={pending}>
          Ajouter / MAJ
        </Button>
      </form>
    </div>
  );
}
