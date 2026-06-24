"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { saveTemoignagesAction } from "./temoignage-actions";
import type { Temoignage } from "@/lib/temoignages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function TemoignageEditor({ initial }: { initial: Temoignage[] }) {
  const [items, setItems] = useState<Temoignage[]>(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<Temoignage>) =>
    setItems((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => setItems((l) => l.filter((_, idx) => idx !== i));
  const add = () => setItems((l) => [...l, { quote: "", name: "" }]);

  return (
    <div className="space-y-3">
      {items.map((t, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border border-primary/12 p-4">
          <div className="flex-1 space-y-3">
            <Textarea value={t.quote} onChange={(e) => update(i, { quote: e.target.value })} rows={2} placeholder="Témoignage…" />
            <Input value={t.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Prénom" />
          </div>
          <button type="button" onClick={() => remove(i)} aria-label="Supprimer" className="mt-1 text-foreground/40 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={add} className="w-full"><Plus className="mr-1 h-4 w-4" /> Ajouter un témoignage</Button>

      <div className="flex items-center gap-3 pt-1">
        <Button type="button" disabled={pending} onClick={() => { setSaved(false); start(async () => { await saveTemoignagesAction(items.filter((t) => t.quote.trim())); setSaved(true); }); }}>
          {pending ? "…" : "Enregistrer les témoignages"}
        </Button>
        {saved && <span className="flex items-center gap-1 text-sm text-foreground/60"><Check className="h-4 w-4" /> Enregistré</span>}
      </div>
    </div>
  );
}
