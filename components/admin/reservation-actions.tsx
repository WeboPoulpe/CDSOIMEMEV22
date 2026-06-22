"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { validateReservationAction, rejectReservationAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function ReservationActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await validateReservationAction(id);
            if (res.error) toast.error(res.error);
            else toast.success("Réservation validée.");
          })
        }
      >
        Valider
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => start(async () => { const res = await rejectReservationAction(id); if (res?.error) toast.error(res.error); else toast("Réservation refusée."); })}
      >
        Refuser
      </Button>
    </div>
  );
}
