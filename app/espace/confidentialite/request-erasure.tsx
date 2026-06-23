"use client";

import { useState, useTransition } from "react";
import { requestErasureAction } from "../actions";
import { Button } from "@/components/ui/button";

export function RequestErasure() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <p className="text-sm text-foreground/70">
        Ta demande a bien été transmise à Charline. Elle procédera à la suppression de tes données
        dans les meilleurs délais.
      </p>
    );
  }

  return (
    <div>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => {
          if (confirm("Confirmer la demande de suppression de toutes tes données ?")) {
            setError(null);
            start(async () => {
              const r = await requestErasureAction();
              if (r.error) setError(r.error);
              else setDone(true);
            });
          }
        }}
      >
        {pending ? "Envoi…" : "Demander la suppression de mes données"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
