"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("cdsm-cookies-ok")) setShow(true);
    } catch {}
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl rounded-2xl border border-primary/15 bg-card/95 p-4 shadow-xl backdrop-blur">
      <p className="text-sm text-foreground/70">
        Ce site n'utilise que des cookies <strong>strictement nécessaires</strong> (connexion et
        sécurité) — aucun traceur. <Link href="/legal/cookies" className="text-primary underline">En savoir plus</Link>.
      </p>
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => {
            try { localStorage.setItem("cdsm-cookies-ok", "1"); } catch {}
            setShow(false);
          }}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          J'ai compris
        </button>
      </div>
    </div>
  );
}
