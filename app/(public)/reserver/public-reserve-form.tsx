"use client";

import { useState, useTransition } from "react";
import { submitPublicBookingAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Prestation = { id: string; nom: string; dureeMinutes: number | null };

export function PublicReserveForm({ prestations }: { prestations: Prestation[] }) {
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    careTypeId: prestations[0]?.id ?? "",
    requestedDate: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (done) {
    return (
      <div className="rounded-2xl bg-muted/50 p-8 text-center">
        <p className="font-display text-xl">Demande envoyée 🌸</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-foreground/65">
          Merci ! Votre praticienne vous recontactera pour confirmer votre rendez-vous.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await submitPublicBookingAction(form);
          if (res?.error) setError(res.error);
          else setDone(true);
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prenom">Prénom</Label>
          <Input id="prenom" value={form.prenom} onChange={set("prenom")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nom">Nom</Label>
          <Input id="nom" value={form.nom} onChange={set("nom")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={set("email")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telephone">Téléphone (optionnel)</Label>
          <Input id="telephone" value={form.telephone} onChange={set("telephone")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="care">Prestation</Label>
        <select
          id="care"
          value={form.careTypeId}
          onChange={set("careTypeId")}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          required
        >
          {prestations.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}{p.dureeMinutes ? ` (${p.dureeMinutes} min)` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date et heure souhaitées</Label>
        <Input id="date" type="datetime-local" value={form.requestedDate} onChange={set("requestedDate")} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Votre message (optionnel)</Label>
        <Textarea id="notes" value={form.notes} onChange={set("notes")} rows={3} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Envoi…" : "Demander mon rendez-vous"}
      </Button>
    </form>
  );
}
