"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { addNoteAction, deleteNoteAction } from "./notes-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Note = { id: string; contenu: string; ressentis: string | null; axes: string | null; date: string };

export function PrivateNotes({ clienteId, notes }: { clienteId: string; notes: Note[] }) {
  const [contenu, setContenu] = useState("");
  const [ressentis, setRessentis] = useState("");
  const [axes, setAxes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-5">
      <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-foreground/55">
        🔒 Notes confidentielles — visibles uniquement par toi.
      </p>

      <div className="space-y-2">
        {notes.length === 0 && <p className="text-sm text-foreground/45">Aucune note pour le moment.</p>}
        {notes.map((n) => (
          <div key={n.id} className="rounded-xl bg-muted/40 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="whitespace-pre-wrap text-sm text-foreground">{n.contenu}</p>
              <button type="button" disabled={pending} aria-label="Supprimer"
                onClick={() => start(async () => { await deleteNoteAction(n.id, clienteId); router.refresh(); })}
                className="shrink-0 text-foreground/30 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {n.ressentis && <p className="mt-1.5 text-sm text-foreground/60"><span className="text-foreground/45">Ressentis :</span> {n.ressentis}</p>}
            {n.axes && <p className="mt-1 text-sm text-foreground/60"><span className="text-foreground/45">Axes à explorer :</span> {n.axes}</p>}
            <p className="mt-2 text-xs text-foreground/40">{n.date}</p>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); setError(null); start(async () => {
          const res = await addNoteAction(clienteId, { contenu, ressentis, axes });
          if (res?.error) setError(res.error); else { setContenu(""); setRessentis(""); setAxes(""); router.refresh(); }
        }); }}
        className="space-y-3 rounded-xl border border-primary/12 p-4"
      >
        <div className="space-y-1.5"><Label>Note de séance</Label><Textarea value={contenu} onChange={(e) => setContenu(e.target.value)} rows={3} required /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Ressentis (optionnel)</Label><Input value={ressentis} onChange={(e) => setRessentis(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Axes à explorer (optionnel)</Label><Input value={axes} onChange={(e) => setAxes(e.target.value)} /></div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" size="sm" disabled={pending || !contenu.trim()}>Ajouter la note</Button>
      </form>
    </div>
  );
}
