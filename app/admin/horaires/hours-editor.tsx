"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Check } from "lucide-react";
import { updateDayAction, addClosureAction, deleteClosureAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DayData = {
  day: number;
  name: string;
  isOpen: boolean;
  start: string;
  end: string;
  lunchStart: string;
  lunchEnd: string;
};

export function DayRow(d: DayData) {
  const [isOpen, setIsOpen] = useState(d.isOpen);
  const [start, setStart] = useState(d.start);
  const [end, setEnd] = useState(d.end);
  const [ls, setLs] = useState(d.lunchStart);
  const [le, setLe] = useState(d.lunchEnd);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start_] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/30 px-4 py-3">
      <span className="w-24 font-medium text-foreground">{d.name}</span>
      <label className="flex items-center gap-2 text-sm text-foreground/70">
        <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} className="h-4 w-4" />
        Ouvert
      </label>

      {isOpen ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/60">
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 w-28" />
          <span>→</span>
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 w-28" />
          <span className="ml-2">pause</span>
          <Input type="time" value={ls} onChange={(e) => setLs(e.target.value)} className="h-9 w-28" />
          <Input type="time" value={le} onChange={(e) => setLe(e.target.value)} className="h-9 w-28" />
        </div>
      ) : (
        <span className="text-sm text-foreground/45">Fermé</span>
      )}

      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        className="ml-auto"
        onClick={() => {
          setError(null); setSaved(false);
          start_(async () => {
            const res = await updateDayAction({ day: d.day, isOpen, start, end, lunchStart: ls, lunchEnd: le });
            if (res?.error) setError(res.error);
            else { setSaved(true); router.refresh(); }
          });
        }}
      >
        {pending ? "…" : saved ? <Check className="h-4 w-4" /> : "Enregistrer"}
      </Button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function Closures({ items }: { items: { id: string; start: string; end: string; reason: string | null }[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-foreground/45">Aucune fermeture programmée.</p>}
        {items.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-2.5">
            <span className="text-sm">
              {c.start === c.end ? c.start : `${c.start} → ${c.end}`}
              {c.reason && <span className="text-foreground/55"> · {c.reason}</span>}
            </span>
            <button
              type="button"
              disabled={pending}
              aria-label="Supprimer"
              onClick={() => start(async () => { await deleteClosureAction(c.id); router.refresh(); })}
              className="grid h-7 w-7 place-items-center rounded-lg text-foreground/35 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-primary/12 p-3">
        <div className="space-y-1.5"><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" /></div>
        <div className="space-y-1.5"><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" /></div>
        <div className="min-w-[10rem] flex-1 space-y-1.5"><Label>Motif (optionnel)</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-9" placeholder="Vacances…" /></div>
        <Button
          type="button"
          size="sm"
          disabled={pending || !from || !to}
          onClick={() => {
            setError(null);
            start(async () => {
              const res = await addClosureAction({ start: from, end: to, reason });
              if (res?.error) setError(res.error);
              else { setFrom(""); setTo(""); setReason(""); router.refresh(); }
            });
          }}
        >
          Ajouter
        </Button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
