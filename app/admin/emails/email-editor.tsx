"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { saveEmailMessagesAction } from "./actions";
import { EMAIL_LABELS, type EmailMessages, type EmailKey } from "@/lib/emails-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const KEYS: EmailKey[] = ["booking_received", "booking_confirmed", "questionnaire", "reset", "booking_notify"];

export function EmailEditor({ initial }: { initial: EmailMessages }) {
  const [msgs, setMsgs] = useState<EmailMessages>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const set = (k: EmailKey, field: "subject" | "intro", value: string) =>
    setMsgs((m) => ({ ...m, [k]: { ...m[k], [field]: value } }));

  return (
    <div className="space-y-4">
      {KEYS.map((k) => (
        <div key={k} className="rounded-2xl border border-primary/10 bg-card/70 p-6 backdrop-blur-sm">
          <h2 className="font-serif text-lg text-foreground">{EMAIL_LABELS[k]}</h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Objet de l'email</Label>
              <Input value={msgs[k].subject} onChange={(e) => set(k, "subject", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea value={msgs[k].intro} onChange={(e) => set(k, "intro", e.target.value)} rows={3} />
            </div>
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={pending}
          onClick={() => { setError(null); setSaved(false); start(async () => {
            const res = await saveEmailMessagesAction(msgs);
            if (res?.error) setError(res.error); else setSaved(true);
          }); }}
        >
          {pending ? "Enregistrement…" : "Enregistrer les emails"}
        </Button>
        {saved && <span className="flex items-center gap-1 text-sm text-foreground/60"><Check className="h-4 w-4" /> Enregistré</span>}
      </div>
    </div>
  );
}
