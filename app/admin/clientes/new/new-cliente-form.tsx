"use client";

import { useState, useTransition } from "react";
import { createClienteAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewClienteForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(fd) => start(async () => { const r = await createClienteAction(fd); if (r?.error) setError(r.error); })}
      className="max-w-md space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="prenom">Prénom</Label><Input id="prenom" name="prenom" /></div>
        <div className="space-y-2"><Label htmlFor="nom">Nom</Label><Input id="nom" name="nom" required /></div>
      </div>
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="telephone">Téléphone</Label><Input id="telephone" name="telephone" /></div>
        <div className="space-y-2"><Label htmlFor="ville">Ville</Label><Input id="ville" name="ville" /></div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Création…" : "Créer la cliente"}</Button>
    </form>
  );
}
