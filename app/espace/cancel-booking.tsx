"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelBookingAction } from "./booking-actions";

export function CancelBooking({ bookingId }: { bookingId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Annuler ce rendez-vous ?")) {
          start(async () => {
            await cancelBookingAction(bookingId);
            router.refresh();
          });
        }
      }}
      className="shrink-0 text-sm text-foreground/45 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "…" : "Annuler"}
    </button>
  );
}
