"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClosedPeriodAction, deleteClosedPeriodAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClosedForm() {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return (
    <form
      action={async (fd) => {
        setPending(true);
        const r = await createClosedPeriodAction(fd);
        setPending(false);
        if (r?.error) toast.error(r.error);
        else { router.refresh(); toast.success("Fermeture ajoutée."); }
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <div>
        <Label htmlFor="startAt">Début</Label>
        <Input id="startAt" name="startAt" type="datetime-local" required />
      </div>
      <div>
        <Label htmlFor="endAt">Fin</Label>
        <Input id="endAt" name="endAt" type="datetime-local" required />
      </div>
      <div>
        <Label htmlFor="reason">Motif</Label>
        <Input id="reason" name="reason" />
      </div>
      <Button type="submit" disabled={pending}>
        Ajouter
      </Button>
    </form>
  );
}

export function DeleteClosedButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await deleteClosedPeriodAction(id);
        router.refresh();
        toast.success("Fermeture supprimée.");
      }}
      className="text-sm text-destructive underline"
    >
      Supprimer
    </button>
  );
}
