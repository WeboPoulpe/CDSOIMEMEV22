"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmBookingAction, refuseBookingAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DemandeActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();

  if (refusing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motif (optionnel)"
          className="h-9 w-48"
        />
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => start(async () => { await refuseBookingAction(id, reason); router.refresh(); })}
        >
          Confirmer le refus
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setRefusing(false)}>Annuler</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => start(async () => { await confirmBookingAction(id); router.refresh(); })}
      >
        Valider
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setRefusing(true)}>Refuser</Button>
    </div>
  );
}
