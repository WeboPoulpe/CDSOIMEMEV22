"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelReservationAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function CancelReservationButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!confirm("Annuler cette réservation confirmée ?")) return;
        start(async () => {
          const r = await cancelReservationAction(id);
          if (r.error) toast.error(r.error);
          else {
            router.refresh();
            toast("Réservation annulée.");
          }
        });
      }}
    >
      Annuler la réservation
    </Button>
  );
}
