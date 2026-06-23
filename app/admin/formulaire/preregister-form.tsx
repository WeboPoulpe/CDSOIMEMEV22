"use client";

import { useState, useTransition } from "react";
import { preregisterAndSendAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PreregisterForm() {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null); setMsg(null); setLink(null);
        start(async () => {
          const res = await preregisterAndSendAction({ prenom, nom, email });
          if (res.error) setError(res.error);
          else { setMsg(`Formulaire envoyé à ${email} — la personne est pré-inscrite.`); setLink(res.demoLink ?? null); setPrenom(""); setNom(""); setEmail(""); }
        });
      }}
      className="space-y-4"
    >
      <p className="text-sm text-foreground/60">
        Renseigne ses informations : elle est <strong>pré-inscrite</strong> et reçoit le
        questionnaire par email.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2"><Label>Prénom</Label><Input value={prenom} onChange={(e) => setPrenom(e.target.value)} /></div>
        <div className="space-y-2"><Label>Nom</Label><Input value={nom} onChange={(e) => setNom(e.target.value)} required /></div>
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-foreground/70">{msg}</p>}
      {link && <a href={link} className="block break-all text-xs text-primary underline">{link}</a>}
      <Button type="submit" disabled={pending}>{pending ? "Envoi…" : "Pré-inscrire et envoyer le formulaire"}</Button>
    </form>
  );
}
