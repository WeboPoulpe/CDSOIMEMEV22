"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { saveForfaitsAction } from "./forfait-actions";
import type { Forfait } from "@/lib/forfaits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ForfaitEditor({ initial }: { initial: Forfait[] }) {
  const [items, setItems] = useState<Forfait[]>(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<Forfait>) =>
    setItems((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => setItems((l) => l.filter((_, idx) => idx !== i));
  const add = () => setItems((l) => [...l, { nom: "", description: "", prix: "", nbSeances: "" }]);

  return (
    <div className="space-y-3">
      {items.map((f, i) => (
        <div key={i} className="rounded-xl border border-primary/12 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Input value={f.nom} onChange={(e) => update(i, { nom: e.target.value })} placeholder="Nom (ex. Transformation)" />
                <Input value={f.nbSeances} onChange={(e) => update(i, { nbSeances: e.target.value })} placeholder="Séances (ex. 3 mois)" />
                <Input value={f.prix} onChange={(e) => update(i, { prix: e.target.value })} placeholder="Prix (ex. dès 240 €)" />
              </div>
              <Textarea value={f.description} onChange={(e) => update(i, { description: e.target.value })} rows={2} placeholder="Description" />
            </div>
            <button type="button" onClick={() => remove(i)} aria-label="Supprimer" className="mt-1 text-foreground/40 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={add} className="w-full"><Plus className="mr-1 h-4 w-4" /> Ajouter un forfait</Button>

      <div className="flex items-center gap-3 pt-1">
        <Button type="button" disabled={pending} onClick={() => { setSaved(false); start(async () => { await saveForfaitsAction(items.filter((f) => f.nom.trim())); setSaved(true); }); }}>
          {pending ? "…" : "Enregistrer les forfaits"}
        </Button>
        {saved && <span className="flex items-center gap-1 text-sm text-foreground/60"><Check className="h-4 w-4" /> Enregistré</span>}
      </div>
    </div>
  );
}
