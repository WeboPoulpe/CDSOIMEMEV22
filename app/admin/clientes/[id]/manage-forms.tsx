"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSeanceAction, addDocumentAction } from "./manage-actions";
import { SEANCE_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AddSeanceForm({ clienteId }: { clienteId: string }) {
  const [type, setType] = useState<string>(SEANCE_TYPES[0]);
  const [date, setDate] = useState("");
  const [lieu, setLieu] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await addSeanceAction(clienteId, { type, date, lieu, notes });
          if (res?.error) setError(res.error);
          else { setDate(""); setLieu(""); setNotes(""); router.refresh(); }
        });
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Prestation</Label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {SEANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Date et heure</Label>
          <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Lieu (optionnel)</Label>
          <Input value={lieu} onChange={(e) => setLieu(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notes (optionnel)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending || !date}>{pending ? "Ajout…" : "Ajouter la séance"}</Button>
    </form>
  );
}

export function AddDocumentForm({ clienteId }: { clienteId: string }) {
  const [titre, setTitre] = useState("");
  const [url, setUrl] = useState("");
  const [categorie, setCategorie] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await addDocumentAction(clienteId, { titre, url, categorie });
          if (res?.error) setError(res.error);
          else { setTitre(""); setUrl(""); setCategorie(""); router.refresh(); }
        });
      }}
      className="grid gap-3 sm:grid-cols-3"
    >
      <Input placeholder="Titre" value={titre} onChange={(e) => setTitre(e.target.value)} required />
      <Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} required />
      <Input placeholder="Catégorie (optionnel)" value={categorie} onChange={(e) => setCategorie(e.target.value)} />
      {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
      <Button type="submit" disabled={pending} className="sm:col-span-3 sm:w-auto sm:justify-self-start">
        {pending ? "Partage…" : "Partager le document"}
      </Button>
    </form>
  );
}
