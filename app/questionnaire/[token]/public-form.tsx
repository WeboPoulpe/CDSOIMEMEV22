"use client";

import { useState, useTransition } from "react";
import { submitPublicQuestionnaireAction, type PublicQuestionnaireInput } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PublicQuestionnaireForm({
  token, defaults,
}: { token: string; defaults: Partial<PublicQuestionnaireInput> }) {
  const [form, setForm] = useState<PublicQuestionnaireInput>({
    prenom: defaults.prenom ?? "",
    nom: defaults.nom ?? "",
    email: defaults.email ?? "",
    telephone: defaults.telephone ?? "",
    date_naissance: "",
    raison_rdv: "",
    objectif: "",
    causes: "",
    consequences: "",
    obstacles: "",
    ressources: "",
    besoins: "",
    echeance: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const set = (k: keyof PublicQuestionnaireInput) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (done) {
    return (
      <div className="rounded-2xl bg-muted/50 p-8 text-center">
        <p className="font-serif text-xl">Merci 🌸</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-foreground/65">
          Ton questionnaire a bien été transmis à Charline. À très bientôt.
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
          const res = await submitPublicQuestionnaireAction(token, form);
          if (res?.error) setError(res.error);
          else setDone(true);
        });
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom"><Input value={form.prenom} onChange={set("prenom")} required /></Field>
        <Field label="Nom"><Input value={form.nom} onChange={set("nom")} required /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} required /></Field>
        <Field label="Téléphone"><Input value={form.telephone} onChange={set("telephone")} /></Field>
        <Field label="Date de naissance"><Input value={form.date_naissance} onChange={set("date_naissance")} placeholder="jj/mm/aaaa" /></Field>
      </div>

      <Area label="Qu'est-ce qui t'amène ? (raison du rendez-vous)" value={form.raison_rdv} onChange={set("raison_rdv")} />
      <Area label="Quel est ton objectif ?" value={form.objectif} onChange={set("objectif")} />
      <Area label="Selon toi, quelles en sont les causes ?" value={form.causes} onChange={set("causes")} />
      <Area label="Quelles conséquences cela a-t-il sur ta vie ?" value={form.consequences} onChange={set("consequences")} />
      <Area label="Quels obstacles rencontres-tu ?" value={form.obstacles} onChange={set("obstacles")} />
      <Area label="Sur quelles ressources peux-tu t'appuyer ?" value={form.ressources} onChange={set("ressources")} />
      <Area label="De quoi as-tu besoin ?" value={form.besoins} onChange={set("besoins")} />
      <Field label="Échéance souhaitée"><Input value={form.echeance} onChange={set("echeance")} /></Field>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Envoi…" : "Transmettre mon questionnaire"}</Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
function Area({ label, value, onChange }: { label: string; value: string | undefined; onChange: (e: { target: { value: string } }) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Textarea value={value} onChange={onChange} rows={2} /></div>;
}
