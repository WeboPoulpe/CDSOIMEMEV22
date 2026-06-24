"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Send, Trash2 } from "lucide-react";
import { updateSeanceAction, sendSeanceSummaryAction, deleteSeanceDetailAction } from "./actions";
import { SEANCE_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  id: string;
  initial: { type: string; date: string; lieu: string; notes: string; exercices: string };
  sent: boolean;
};

export function SeanceForm({ id, initial, sent }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryMsg, setSummaryMsg] = useState<string | null>(sent ? "Compte-rendu déjà envoyé." : null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setError(null); setSaved(false);
          start(async () => {
            const res = await updateSeanceAction(id, fd);
            if (res?.error) setError(res.error); else { setSaved(true); router.refresh(); }
          });
        }}
        className="space-y-4 rounded-2xl border border-primary/10 bg-card/70 p-6 backdrop-blur-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Prestation</Label>
            <select name="type" defaultValue={initial.type} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {SEANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>Date et heure</Label><Input type="datetime-local" name="date" defaultValue={initial.date} required /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Lieu</Label><Input name="lieu" defaultValue={initial.lieu} placeholder="Cabinet…" /></div>
        </div>
        <div className="space-y-1.5"><Label>Notes de séance</Label><Textarea name="notes" defaultValue={initial.notes} rows={4} /></div>
        <div className="space-y-1.5"><Label>Exercices à pratiquer</Label><Textarea name="exercices" defaultValue={initial.exercices} rows={3} /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>{pending ? "…" : "Enregistrer"}</Button>
          {saved && <span className="flex items-center gap-1 text-sm text-foreground/60"><Check className="h-4 w-4" /> Enregistré</span>}
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => { setSummaryMsg(null); start(async () => {
            const res = await sendSeanceSummaryAction(id);
            if (res?.error) setSummaryMsg(res.error); else { setSummaryMsg("Compte-rendu envoyé à la cliente ✓"); router.refresh(); }
          }); }}
        >
          <Send className="mr-1 h-4 w-4" /> Envoyer le compte-rendu
        </Button>
        {summaryMsg && <span className="text-sm text-foreground/60">{summaryMsg}</span>}

        <button
          type="button"
          disabled={pending}
          onClick={() => { if (confirm("Supprimer cette séance ?")) start(async () => { await deleteSeanceDetailAction(id); router.push("/admin/seances"); }); }}
          className="ml-auto flex items-center gap-1 text-sm text-foreground/45 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" /> Supprimer
        </button>
      </div>
    </div>
  );
}
