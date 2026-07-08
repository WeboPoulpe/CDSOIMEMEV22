"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { markPaidAction, resendLinkAction } from "./payment-actions";

type Props = {
  paymentId: string;
  status: string;
  amountLabel: string;
  payUrl: string;
};

export function PaymentPanel({ paymentId, status, amountLabel, payUrl }: Props) {
  const [current, setCurrent] = useState(status);
  const [pending, start] = useTransition();

  const paid = current === "paid";

  return (
    <div className="mt-6 rounded-2xl border border-primary/10 bg-card/70 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-serif text-lg text-foreground">Paiement</p>
          <p className="text-sm text-foreground/60">{amountLabel}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {paid ? "Réglé" : "En attente"}
        </span>
      </div>

      {!paid && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await markPaidAction(paymentId);
                if (r.error) toast.error(r.error);
                else {
                  setCurrent("paid");
                  toast.success("Marqué comme réglé.");
                }
              })
            }
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Marquer comme réglé
          </button>
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await resendLinkAction(paymentId);
                if (r.error) toast.error(r.error);
                else toast.success("Lien renvoyé par email.");
              })
            }
            className="rounded-full border border-primary/20 px-4 py-2 text-sm text-foreground disabled:opacity-50"
          >
            Renvoyer le lien
          </button>
          <a
            href={payUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-primary/20 px-4 py-2 text-sm text-foreground"
          >
            Ouvrir le lien
          </a>
        </div>
      )}
    </div>
  );
}
