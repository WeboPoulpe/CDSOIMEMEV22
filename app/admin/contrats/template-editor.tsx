"use client";

import { useState } from "react";
import { toast } from "sonner";
import { saveTemplateAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELDS = [
  "client_nom",
  "client_email",
  "societe",
  "espace",
  "date_debut",
  "date_fin",
  "unite",
  "montant",
  "nom_lieu",
  "adresse_lieu",
];

export function TemplateEditor({
  template,
}: {
  template?: { id: string; name: string; body: string };
}) {
  const [pending, setPending] = useState(false);
  const [body, setBody] = useState(template?.body ?? "");

  return (
    <form
      action={async (fd) => {
        setPending(true);
        const r = await saveTemplateAction(fd);
        setPending(false);
        if (r?.error) toast.error(r.error);
        else toast.success("Modèle enregistré.");
      }}
      className="space-y-4"
    >
      {template?.id && <input type="hidden" name="id" value={template.id} />}

      <div className="space-y-2">
        <Label htmlFor="name">Nom du modèle</Label>
        <Input
          id="name"
          name="name"
          defaultValue={template?.name ?? "Contrat de location standard"}
        />
      </div>

      <div className="space-y-2">
        <Label>Champs de fusion disponibles</Label>
        <div className="flex flex-wrap gap-2 text-xs">
          {FIELDS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setBody((b) => b + `{{${f}}}`)}
              className="rounded-full border border-muted px-2 py-1 hover:bg-muted"
            >
              {`{{${f}}}`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Corps du contrat</Label>
        <Textarea
          id="body"
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={18}
          className="font-mono text-sm"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le modèle"}
      </Button>
    </form>
  );
}
