"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, CalendarPlus } from "lucide-react";
import {
  createSeanceAction, deleteSeanceAction, createPersonalSlotAction, deletePersonalSlotAction,
} from "./actions";
import { SEANCE_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Cliente = { id: string; name: string };
type Seance = { id: string; type: string; time: string; who: string };
type Rdv = { id: string; time: string; who: string; presta: string };
type Perso = { id: string; title: string; time: string };

export function DayPlanner({
  date, dateLabel, clientes, seances, rdv, perso,
}: {
  date: string;
  dateLabel: string;
  clientes: Cliente[];
  seances: Seance[];
  rdv: Rdv[];
  perso: Perso[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });

  const empty = seances.length === 0 && rdv.length === 0 && perso.length === 0;

  return (
    <section className="mt-6 rounded-2xl border border-primary/10 bg-card/70 p-6 backdrop-blur-sm">
      <h2 className="font-serif text-lg capitalize text-foreground">{dateLabel}</h2>

      <div className="mt-4 space-y-2">
        {empty && <p className="text-sm text-foreground/45">Rien de prévu ce jour-là.</p>}

        {seances.map((s) => (
          <Row key={s.id} time={s.time} label={`${s.who} — ${s.type}`} tone="bg-primary/12 text-primary"
            onDelete={() => run(() => deleteSeanceAction(s.id))} disabled={pending} />
        ))}
        {rdv.map((r) => (
          <Row key={r.id} time={r.time} label={`${r.who} — ${r.presta}`} tone="bg-secondary/15 text-secondary" badge="RDV confirmé" />
        ))}
        {perso.map((p) => (
          <Row key={p.id} time={p.time} label={p.title} tone="bg-[#C9A24B]/18 text-[#A8842F]"
            onDelete={() => run(() => deletePersonalSlotAction(p.id))} disabled={pending} />
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <AddSeance date={date} clientes={clientes} onDone={() => router.refresh()} />
        <AddPerso date={date} onDone={() => router.refresh()} />
      </div>
    </section>
  );
}

function Row({
  time, label, tone, badge, onDelete, disabled,
}: { time: string; label: string; tone: string; badge?: string; onDelete?: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}>{time}</span>
        <span className="truncate text-sm text-foreground">{label}</span>
        {badge && <span className="shrink-0 text-xs text-foreground/45">{badge}</span>}
      </div>
      {onDelete && (
        <button type="button" disabled={disabled} onClick={onDelete} aria-label="Supprimer"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-foreground/35 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function AddSeance({ date, clientes, onDone }: { date: string; clientes: Cliente[]; onDone: () => void }) {
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [type, setType] = useState<string>(SEANCE_TYPES[0]);
  const [time, setTime] = useState("09:00");
  const [lieu, setLieu] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <details className="rounded-xl border border-primary/12 p-3 [&_summary]:cursor-pointer">
      <summary className="flex items-center gap-2 text-sm font-medium text-primary"><Plus className="h-4 w-4" /> Ajouter une séance</summary>
      <div className="mt-3 space-y-3">
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Prestation</Label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {SEANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Heure</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Lieu</Label><Input value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Cabinet…" /></div>
        </div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="button" size="sm" disabled={pending || !clienteId}
          onClick={() => { setError(null); start(async () => {
            const res = await createSeanceAction({ clienteId, type, dateTime: `${date}T${time}`, lieu, notes });
            if (res?.error) setError(res.error); else onDone();
          }); }}>
          {pending ? "Ajout…" : "Planifier la séance"}
        </Button>
      </div>
    </details>
  );
}

function AddPerso({ date, onDone }: { date: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [from, setFrom] = useState("12:00");
  const [to, setTo] = useState("13:00");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <details className="rounded-xl border border-primary/12 p-3 [&_summary]:cursor-pointer">
      <summary className="flex items-center gap-2 text-sm font-medium text-[#A8842F]"><CalendarPlus className="h-4 w-4" /> Bloquer du temps perso</summary>
      <div className="mt-3 space-y-3">
        <div className="space-y-1.5"><Label>Intitulé</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Coiffeur, déjeuner…" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>De</Label><Input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>À</Label><Input type="time" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="button" size="sm" variant="secondary" disabled={pending || !title.trim()}
          onClick={() => { setError(null); start(async () => {
            const res = await createPersonalSlotAction({ title, start: `${date}T${from}`, end: `${date}T${to}` });
            if (res?.error) setError(res.error); else onDone();
          }); }}>
          {pending ? "Ajout…" : "Bloquer ce créneau"}
        </Button>
      </div>
    </details>
  );
}
