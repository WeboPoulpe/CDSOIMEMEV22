"use client";

import { useState } from "react";
import { toast } from "sonner";
import { saveSettingsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type S = { businessName: string; contactEmail: string; contactPhone: string | null; fromEmail: string; address: string | null };

export function SettingsForm({ settings }: { settings: S | null }) {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async (fd) => { setPending(true); const r = await saveSettingsAction(fd); setPending(false); if (r?.error) toast.error(r.error); else toast.success("Réglages enregistrés."); }}
      className="max-w-lg space-y-4"
    >
      <div className="space-y-2"><Label htmlFor="businessName">Nom du lieu</Label><Input id="businessName" name="businessName" defaultValue={settings?.businessName} required /></div>
      <div className="space-y-2"><Label htmlFor="contactEmail">Email de contact (notifications admin)</Label><Input id="contactEmail" name="contactEmail" type="email" defaultValue={settings?.contactEmail} required /></div>
      <div className="space-y-2"><Label htmlFor="fromEmail">Email expéditeur</Label><Input id="fromEmail" name="fromEmail" type="email" defaultValue={settings?.fromEmail} required /></div>
      <div className="space-y-2"><Label htmlFor="contactPhone">Téléphone</Label><Input id="contactPhone" name="contactPhone" defaultValue={settings?.contactPhone ?? ""} /></div>
      <div className="space-y-2"><Label htmlFor="address">Adresse</Label><Input id="address" name="address" defaultValue={settings?.address ?? ""} /></div>
      <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>
  );
}
