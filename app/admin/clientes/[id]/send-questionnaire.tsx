"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendQuestionnaireAction } from "./manage-actions";
import { Button } from "@/components/ui/button";

export function SendQuestionnaire({ clienteId }: { clienteId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-1.5 text-right">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await sendQuestionnaireAction(clienteId);
            if (r.error) { setMsg(r.error); setLink(null); }
            else { setMsg("Questionnaire envoyé ✓"); setLink(r.demoLink ?? null); }
            router.refresh();
          })
        }
      >
        {pending ? "Envoi…" : "Envoyer le questionnaire"}
      </Button>
      {msg && <p className="text-xs text-foreground/60">{msg}</p>}
      {link && <a href={link} className="block break-all text-xs text-primary underline">{link}</a>}
    </div>
  );
}
