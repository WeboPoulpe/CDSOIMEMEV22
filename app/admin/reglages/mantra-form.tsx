"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { setMantraAction } from "./mantra-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function MantraForm({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      <Textarea value={value} onChange={(e) => { setValue(e.target.value); setSaved(false); }} rows={2} placeholder="Une phrase douce affichée à tes clientes…" />
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" disabled={pending} onClick={() => start(async () => { await setMantraAction(value); setSaved(true); })}>
          {pending ? "…" : "Enregistrer le mantra"}
        </Button>
        {saved && <span className="flex items-center gap-1 text-sm text-foreground/60"><Check className="h-4 w-4" /> Enregistré</span>}
      </div>
    </div>
  );
}
