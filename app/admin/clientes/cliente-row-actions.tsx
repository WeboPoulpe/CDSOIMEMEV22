"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { updateClienteStatutAction, deleteClienteAction } from "./actions";
import { CLIENTE_STATUTS } from "@/lib/constants";

export function StatutSelect({ id, statut }: { id: string; statut: string | null }) {
  const [value, setValue] = useState(statut ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();

  // Keep an out-of-list current value visible so nothing is lost.
  const base = CLIENTE_STATUTS as readonly string[];
  const options = value && !base.includes(value) ? [value, ...base] : base;

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        setValue(v);
        start(async () => {
          await updateClienteStatutAction(id, v);
          router.refresh();
        });
      }}
      className="w-full max-w-[12rem] rounded-lg border border-primary/15 bg-background px-2.5 py-1.5 text-sm text-foreground disabled:opacity-50"
    >
      <option value="">— Sans statut</option>
      {options.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

export function DeleteCliente({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Supprimer ${name}`}
      onClick={() => {
        if (confirm(`Supprimer ${name} et toutes ses données (séances, demandes, documents, messages) ? Cette action est définitive.`)) {
          start(async () => {
            await deleteClienteAction(id);
            router.refresh();
          });
        }
      }}
      className="grid h-8 w-8 place-items-center rounded-lg text-foreground/35 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
