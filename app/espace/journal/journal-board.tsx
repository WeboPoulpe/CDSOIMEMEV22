"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { addJournalAction, deleteJournalAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Entry = { id: string; contenu: string; partage: boolean; date: string };

export function JournalBoard({ entries }: { entries: Entry[] }) {
  const [contenu, setContenu] = useState("");
  const [partage, setPartage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => { e.preventDefault(); setError(null); start(async () => {
          const res = await addJournalAction(contenu, partage);
          if (res?.error) setError(res.error); else { setContenu(""); setPartage(false); router.refresh(); }
        }); }}
        className="space-y-3"
      >
        <Textarea value={contenu} onChange={(e) => setContenu(e.target.value)} rows={3} placeholder="Comment te sens-tu aujourd'hui ?" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-foreground/65">
            <input type="checkbox" checked={partage} onChange={(e) => setPartage(e.target.checked)} className="h-4 w-4" />
            Partager avec ma praticienne
          </label>
          <Button type="submit" size="sm" disabled={pending || !contenu.trim()}>Enregistrer</Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="space-y-2">
        {entries.length === 0 && <p className="text-sm text-foreground/45">Ton journal est vide pour le moment.</p>}
        {entries.map((j) => (
          <div key={j.id} className="rounded-xl bg-muted/40 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="whitespace-pre-wrap text-sm text-foreground">{j.contenu}</p>
              <button type="button" disabled={pending} aria-label="Supprimer"
                onClick={() => start(async () => { await deleteJournalAction(j.id); router.refresh(); })}
                className="shrink-0 text-foreground/30 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 flex items-center gap-2 text-xs text-foreground/40">
              {j.date}
              {j.partage && <span className="rounded-full bg-primary/12 px-2 py-0.5 text-primary">partagé</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
