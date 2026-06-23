"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePicker } from "./image-picker";

type State = { error?: string } | undefined;

export type PrestationInitial = {
  nom: string;
  description: string;
  duree_minutes: number;
  prix: number;
  ordre: number;
  actif: boolean;
  image: string;
};

export function PrestationForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  initial?: PrestationInitial;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(action, undefined);

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <div className="space-y-2">
        <Label>Photo</Label>
        <ImagePicker name="image_url" initial={initial?.image} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nom">Nom de la prestation</Label>
        <Input id="nom" name="nom" defaultValue={initial?.nom} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={initial?.description} rows={2} />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="duree_minutes">Durée (min)</Label>
          <Input id="duree_minutes" name="duree_minutes" type="number" min={5} step={5} defaultValue={initial?.duree_minutes ?? 60} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prix">Prix (€)</Label>
          <Input id="prix" name="prix" type="number" min={0} step="0.01" defaultValue={initial?.prix ?? 70} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ordre">Ordre d'affichage</Label>
          <Input id="ordre" name="ordre" type="number" min={0} defaultValue={initial?.ordre ?? 0} />
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" name="actif" defaultChecked={initial ? initial.actif : true} className="h-4 w-4 rounded border-primary/30 text-primary" />
        Visible à la réservation (active)
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : submitLabel}
      </Button>
    </form>
  );
}
