"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ResetDemoButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Réinitialiser toutes les données de démo ?")) return;
        setPending(true);
        const res = await fetch("/api/demo/reset", { method: "POST" });
        setPending(false);
        if (res.ok) { toast.success("Démo réinitialisée."); setTimeout(() => location.reload(), 800); }
        else toast.error("Reset impossible (hors mode démo ?).");
      }}
    >
      {pending ? "Réinitialisation…" : "🔄 Réinitialiser la démo"}
    </Button>
  );
}
