"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { togglePrestationActifAction, deletePrestationAction } from "./actions";

export function CardActions({ id, nom, actif }: { id: string; nom: string; actif: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex items-center gap-1">
      {error && <span className="mr-1 text-xs text-red-600">{error}</span>}
      <Link
        href={`/admin/prestations/${id}`}
        aria-label={`Modifier ${nom}`}
        className="grid h-8 w-8 place-items-center rounded-lg text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        type="button"
        disabled={pending}
        aria-label={actif ? "Désactiver" : "Activer"}
        onClick={() => start(async () => { await togglePrestationActifAction(id, !actif); router.refresh(); })}
        className="grid h-8 w-8 place-items-center rounded-lg text-foreground/45 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
      >
        {actif ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <button
        type="button"
        disabled={pending}
        aria-label={`Supprimer ${nom}`}
        onClick={() => {
          setError(null);
          if (confirm(`Supprimer la prestation « ${nom} » ?`)) {
            start(async () => {
              const res = await deletePrestationAction(id);
              if (res?.error) setError(res.error);
              else router.refresh();
            });
          }
        }}
        className="grid h-8 w-8 place-items-center rounded-lg text-foreground/45 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
