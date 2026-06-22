"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBookingRequestAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Prestation = { id: string; nom: string; duree_minutes: number | null };

export function ReserveForm({ prestations }: { prestations: Prestation[] }) {
  const [careTypeId, setCareTypeId] = useState(prestations[0]?.id ?? "");
  const [requestedDate, setRequestedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (done) {
    return (
      <div className="rounded-2xl bg-muted/50 p-6 text-center">
        <p className="font-display text-lg">Demande envoyée 🌸</p>
        <p className="mt-2 text-sm text-foreground/65">
          Votre praticienne vous confirmera ce rendez-vous très bientôt.
        </p>
        <Button className="mt-4" onClick={() => router.push("/espace")}>Retour à mon espace</Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await createBookingRequestAction({ careTypeId, requestedDate, notes });
          if (res?.error) setError(res.error);
          else { setDone(true); router.refresh(); }
        });
      }}
      className="max-w-lg space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="care">Prestation</Label>
        <select
          id="care"
          value={careTypeId}
          onChange={(e) => setCareTypeId(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          required
        >
          {prestations.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}{p.duree_minutes ? ` (${p.duree_minutes} min)` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date et heure souhaitées</Label>
        <Input
          id="date"
          type="datetime-local"
          value={requestedDate}
          onChange={(e) => setRequestedDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Un mot pour votre praticienne (optionnel)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending || !careTypeId || !requestedDate}>
        {pending ? "Envoi…" : "Demander ce rendez-vous"}
      </Button>
    </form>
  );
}
