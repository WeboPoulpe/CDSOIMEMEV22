"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendPraticienneMessageAction } from "./reply-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReplyComposer({ clienteId }: { clienteId: string }) {
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        start(async () => {
          const res = await sendPraticienneMessageAction(clienteId, value);
          if (!res?.error) {
            setValue("");
            router.refresh();
          }
        });
      }}
      className="flex flex-col gap-2"
    >
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Répondre à la cliente…"
        rows={2}
      />
      <Button type="submit" disabled={pending || !value.trim()} className="self-end">
        {pending ? "Envoi…" : "Envoyer"}
      </Button>
    </form>
  );
}
