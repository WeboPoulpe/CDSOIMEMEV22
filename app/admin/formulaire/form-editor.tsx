"use client";

import { useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus, Check } from "lucide-react";
import { saveQuestionnaireAction } from "./actions";
import type { QDef, QField } from "@/lib/questionnaire";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FormEditor({ initial }: { initial: QDef }) {
  const [title, setTitle] = useState(initial.title);
  const [intro, setIntro] = useState(initial.intro);
  const [fields, setFields] = useState<QField[]>(initial.fields);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<QField>) =>
    setFields((f) => f.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => setFields((f) => f.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setFields((f) => {
      const j = i + dir;
      if (j < 0 || j >= f.length) return f;
      const copy = [...f];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  const add = () =>
    setFields((f) => [...f, { id: crypto.randomUUID(), label: "", type: "textarea" }]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/10 bg-card/70 p-6 backdrop-blur-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titre du questionnaire</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Texte d'introduction</Label>
            <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {fields.map((f, i) => (
          <div key={f.id} className="rounded-2xl border border-primary/10 bg-card/70 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <span className="mt-2 w-6 text-center font-serif text-foreground/40">{i + 1}</span>
              <div className="flex-1 space-y-3">
                <Input value={f.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Intitulé de la question" />
                <div className="flex items-center gap-3">
                  <select value={f.type} onChange={(e) => update(i, { type: e.target.value as QField["type"] })} className="h-9 rounded-md border border-input bg-background px-2.5 text-sm">
                    <option value="textarea">Réponse longue</option>
                    <option value="text">Réponse courte</option>
                  </select>
                  <div className="ml-auto flex items-center gap-1">
                    <button type="button" onClick={() => move(i, -1)} className="grid h-8 w-8 place-items-center rounded-lg text-foreground/40 hover:bg-muted hover:text-foreground"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => move(i, 1)} className="grid h-8 w-8 place-items-center rounded-lg text-foreground/40 hover:bg-muted hover:text-foreground"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => remove(i)} className="grid h-8 w-8 place-items-center rounded-lg text-foreground/40 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={add} className="w-full"><Plus className="mr-1 h-4 w-4" /> Ajouter une question</Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={pending}
          onClick={() => { setError(null); setSaved(false); start(async () => {
            const res = await saveQuestionnaireAction({ title, intro, fields });
            if (res?.error) setError(res.error); else setSaved(true);
          }); }}
        >
          {pending ? "Enregistrement…" : "Enregistrer le formulaire"}
        </Button>
        {saved && <span className="flex items-center gap-1 text-sm text-foreground/60"><Check className="h-4 w-4" /> Enregistré</span>}
      </div>
    </div>
  );
}
