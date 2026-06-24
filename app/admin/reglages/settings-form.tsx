"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { saveSettingsAction } from "./actions";
import { ImagePicker } from "@/app/admin/prestations/image-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type State = { error?: string; ok?: boolean } | undefined;

export type SettingsInitial = {
  nom_praticienne: string;
  forme_juridique: string;
  siret: string;
  adresse_entreprise: string;
  telephone: string;
  email: string;
  photo_profil: string;
  logo_praticienne: string;
};

export function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const [state, action, pending] = useActionState<State, FormData>(saveSettingsAction, undefined);

  return (
    <form action={action} className="space-y-6">
      <div className="rounded-2xl border border-primary/10 bg-card/70 p-6 backdrop-blur-sm">
        <h2 className="font-serif text-lg text-foreground">Identité</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nom affiché"><Input name="nom_praticienne" defaultValue={initial.nom_praticienne} /></Field>
          <Field label="Email de contact"><Input name="email" type="email" defaultValue={initial.email} /></Field>
          <Field label="Téléphone"><Input name="telephone" defaultValue={initial.telephone} /></Field>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/10 bg-card/70 p-6 backdrop-blur-sm">
        <h2 className="font-serif text-lg text-foreground">Informations légales (mentions légales)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Forme juridique"><Input name="forme_juridique" defaultValue={initial.forme_juridique} placeholder="Auto-entrepreneur" /></Field>
          <Field label="SIRET"><Input name="siret" defaultValue={initial.siret} /></Field>
          <div className="sm:col-span-2">
            <Field label="Adresse"><Input name="adresse_entreprise" defaultValue={initial.adresse_entreprise} placeholder="Sainte-Savine (10300)" /></Field>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary/10 bg-card/70 p-6 backdrop-blur-sm">
          <h2 className="font-serif text-lg text-foreground">Photo</h2>
          <p className="mb-3 text-sm text-foreground/55">Affichée sur la page d'accueil.</p>
          <ImagePicker name="photo_profil" initial={initial.photo_profil} />
        </div>
        <div className="rounded-2xl border border-primary/10 bg-card/70 p-6 backdrop-blur-sm">
          <h2 className="font-serif text-lg text-foreground">Logo</h2>
          <p className="mb-3 text-sm text-foreground/55">Conservé pour usage futur.</p>
          <ImagePicker name="logo_praticienne" initial={initial.logo_praticienne} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
        {state?.ok && <span className="flex items-center gap-1 text-sm text-foreground/60"><Check className="h-4 w-4" /> Enregistré</span>}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
