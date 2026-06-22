"use client";

import { useState } from "react";
import { toast } from "sonner";
import { upsertResourceAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Resource = {
  id?: string; name?: string; slug?: string; type?: string; description?: string | null;
  capacity?: number; requiresValidation?: boolean; active?: boolean; sortOrder?: number;
};

export function ResourceForm({ resource }: { resource?: Resource }) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => {
        setPending(true);
        const res = await upsertResourceAction(fd);
        setPending(false);
        if (res?.error) toast.error(res.error);
      }}
      className="max-w-lg space-y-4"
    >
      {resource?.id && <input type="hidden" name="id" value={resource.id} />}
      <div className="space-y-2"><Label htmlFor="name">Nom</Label><Input id="name" name="name" defaultValue={resource?.name} required /></div>
      <div className="space-y-2"><Label htmlFor="slug">Slug</Label><Input id="slug" name="slug" defaultValue={resource?.slug} required /></div>
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <select id="type" name="type" defaultValue={resource?.type ?? "COWORKING"} className="w-full rounded-lg border border-muted px-3 py-2">
          <option value="COWORKING">Coworking</option>
          <option value="MEETING_ROOM">Salle de réunion</option>
          <option value="EVENT_SPACE">Espace événementiel</option>
          <option value="OFFICE">Bureau</option>
        </select>
      </div>
      <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" defaultValue={resource?.description ?? ""} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label htmlFor="capacity">Capacité</Label><Input id="capacity" name="capacity" type="number" min={1} defaultValue={resource?.capacity ?? 1} required /></div>
        <div className="space-y-2"><Label htmlFor="sortOrder">Ordre</Label><Input id="sortOrder" name="sortOrder" type="number" defaultValue={resource?.sortOrder ?? 0} /></div>
      </div>
      <label className="flex items-center gap-2"><input type="checkbox" name="requiresValidation" defaultChecked={resource?.requiresValidation ?? false} /> Validation requise</label>
      <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={resource?.active ?? true} /> Actif</label>
      <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>
  );
}
