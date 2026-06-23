"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RequestForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [demoLink, setDemoLink] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div className="space-y-4 text-sm">
        <p className="text-foreground/75">
          Si un compte existe pour <strong>{email}</strong>, un lien pour définir ton mot de passe
          vient d'être envoyé par email. Pense à vérifier tes spams.
        </p>
        {demoLink && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="mb-1 text-xs text-foreground/55">Mode démo — lien direct :</p>
            <Link href={demoLink} className="break-all text-primary underline">{demoLink}</Link>
          </div>
        )}
        <Link href="/login" className="inline-block text-primary hover:underline">← Retour à la connexion</Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await requestPasswordResetAction(email);
          setDemoLink(res.demoLink ?? null);
          setSent(true);
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Ton email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={pending || !email}>
        {pending ? "Envoi…" : "Recevoir mon lien"}
      </Button>
    </form>
  );
}
