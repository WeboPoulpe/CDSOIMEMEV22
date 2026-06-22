"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setReservationPaidAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function PaymentToggle({ id, paid }: { id: string; paid: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function set(next: boolean) {
    start(async () => {
      const res = await setReservationPaidAction(id, next);
      if (res.error) toast.error(res.error);
      else {
        router.refresh();
        toast.success(next ? "Marquée payée." : "Marquée en attente de paiement.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Paiement :</span>
      <Button size="sm" variant={paid ? "default" : "outline"} disabled={pending} onClick={() => set(true)}>
        Payée
      </Button>
      <Button size="sm" variant={!paid ? "default" : "outline"} disabled={pending} onClick={() => set(false)}>
        En attente
      </Button>
    </div>
  );
}
