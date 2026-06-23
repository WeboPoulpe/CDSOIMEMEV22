"use client";

import { useState, useTransition } from "react";
import type { QField } from "@/lib/questionnaire";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type Identity = { prenom: string; nom: string; email: string; telephone: string };
export type Answer = { label: string; value: string };

export function DynamicQuestionnaireForm({
  fields, defaults, submit,
}: {
  fields: QField[];
  defaults: Partial<Identity>;
  submit: (identity: Identity, answers: Answer[]) => Promise<{ ok?: boolean; error?: string }>;
}) {
  const [identity, setIdentity] = useState<Identity>({
    prenom: defaults.prenom ?? "",
    nom: defaults.nom ?? "",
    email: defaults.email ?? "",
    telephone: defaults.telephone ?? "",
  });
  const [ans, setAns] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const setId = (k: keyof Identity) => (e: { target: { value: string } }) =>
    setIdentity((s) => ({ ...s, [k]: e.target.value }));

  if (done) {
    return (
      <div className="rounded-2xl bg-muted/50 p-8 text-center">
        <p className="font-serif text-xl">Merci 🌸</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-foreground/65">
          Ton questionnaire a bien été transmis.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const answers: Answer[] = fields.map((f) => ({ label: f.label, value: (ans[f.id] ?? "").trim() }));
        start(async () => {
          const res = await submit(identity, answers);
          if (res?.error) setError(res.error);
          else setDone(true);
        });
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom"><Input value={identity.prenom} onChange={setId("prenom")} required /></Field>
        <Field label="Nom"><Input value={identity.nom} onChange={setId("nom")} required /></Field>
        <Field label="Email"><Input type="email" value={identity.email} onChange={setId("email")} required /></Field>
        <Field label="Téléphone"><Input value={identity.telephone} onChange={setId("telephone")} /></Field>
      </div>

      {fields.map((f) => (
        <Field key={f.id} label={f.label}>
          {f.type === "text" ? (
            <Input value={ans[f.id] ?? ""} onChange={(e) => setAns((a) => ({ ...a, [f.id]: e.target.value }))} />
          ) : (
            <Textarea value={ans[f.id] ?? ""} onChange={(e) => setAns((a) => ({ ...a, [f.id]: e.target.value }))} rows={2} />
          )}
        </Field>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Envoi…" : "Transmettre mon questionnaire"}</Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
