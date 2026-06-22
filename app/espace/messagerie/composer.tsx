"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendClientMessageAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function Composer() {
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        start(async () => {
          const res = await sendClientMessageAction(value);
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
        placeholder="Écrivez à votre praticienne…"
        rows={3}
      />
      <Button type="submit" disabled={pending || !value.trim()} className="self-end">
        {pending ? "Envoi…" : "Envoyer"}
      </Button>
    </form>
  );
}
