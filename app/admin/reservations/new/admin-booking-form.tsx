"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createReservationsBatchAction,
  previewEmailAction,
  type EmailPreviewType,
} from "@/app/admin/actions";
import {
  AvailabilityCalendar,
  slotKey,
  type CalendarSelection,
} from "@/components/public/availability-calendar";
import { formatEuros } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Pricing = { unit: string; label: string | null; priceCents: number };
type Resource = { id: string; name: string; type: string; pricings: Pricing[] };

function slotText(s: CalendarSelection, unit: string, hour: number) {
  if (unit === "MONTH") return s.date.slice(0, 7);
  if (unit === "HALF_DAY")
    return `${s.date} · ${s.half === "PM" ? "après-midi (14h-18h)" : "matin (9h-13h)"}`;
  if (unit === "HOUR") return `${s.date} · ${hour}h-${hour + 1}h`;
  return `${s.date} · journée`;
}

export function AdminBookingForm({ resources }: { resources: Resource[] }) {
  const router = useRouter();
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? "");
  const resource = resources.find((r) => r.id === resourceId);
  const [unit, setUnit] = useState(resource?.pricings[0]?.unit ?? "DAY");
  const [hour, setHour] = useState(9);
  const [monthVal, setMonthVal] = useState("");
  const [selected, setSelected] = useState<CalendarSelection[]>([]);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [sendEmail, setSendEmail] = useState(false);
  const [paid, setPaid] = useState(false);
  const [saving, setSaving] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<{ html: string; subject: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewType, setPreviewType] = useState<EmailPreviewType>("confirmation");

  async function loadPreview(type: EmailPreviewType) {
    setPreviewType(type);
    setPreview(null);
    setPreviewLoading(true);
    const first = selected[0];
    const res = await previewEmailAction({
      resourceId,
      unit,
      date: first?.date,
      half: unit === "HALF_DAY" ? first?.half ?? "AM" : null,
      hour: unit === "HOUR" ? hour : undefined,
      customerName: customer.name,
      type,
    });
    setPreviewLoading(false);
    if ("error" in res) {
      toast.error(res.error);
      setPreviewOpen(false);
      return;
    }
    setPreview(res);
  }

  function openPreview() {
    setPreviewOpen(true);
    loadPreview("confirmation");
  }

  const PREVIEW_TABS: { type: EmailPreviewType; label: string }[] = [
    { type: "confirmation", label: "Confirmation" },
    { type: "request", label: "Demande reçue" },
    { type: "rejection", label: "Refus" },
    { type: "admin", label: "Notification admin" },
  ];

  const selectedKeys = useMemo(() => selected.map(slotKey), [selected]);

  function toggle(sel: CalendarSelection) {
    const k = slotKey(sel);
    setSelected((prev) =>
      prev.some((s) => slotKey(s) === k) ? prev.filter((s) => slotKey(s) !== k) : [...prev, sel]
    );
  }
  function addMonth() {
    if (!monthVal) return;
    const sel: CalendarSelection = { date: `${monthVal}-01`, half: null };
    const k = slotKey(sel);
    setSelected((prev) => (prev.some((s) => slotKey(s) === k) ? prev : [...prev, sel]));
    setMonthVal("");
  }

  function changeResource(id: string) {
    setResourceId(id);
    const r = resources.find((x) => x.id === id);
    setUnit(r?.pricings[0]?.unit ?? "DAY");
    setSelected([]);
  }
  function changeUnit(u: string) {
    setUnit(u);
    setSelected([]);
    setMonthVal("");
  }

  async function submit() {
    if (!selected.length) return toast.error("Sélectionnez au moins un créneau.");
    if (!customer.name.trim() || !customer.email.trim())
      return toast.error("Le nom et l'email du client sont requis.");
    setSaving(true);
    const res = await createReservationsBatchAction({
      resourceId,
      unit,
      slots: selected.map((s) => ({
        date: s.date,
        half: unit === "HALF_DAY" ? s.half : null,
        hour: unit === "HOUR" ? hour : undefined,
      })),
      customer,
      sendEmail,
      paid,
    });
    setSaving(false);
    if ("error" in res) return toast.error(res.error);
    if (res.created > 0) toast.success(`${res.created} réservation(s) créée(s).`);
    if (res.failed.length > 0)
      toast(`${res.failed.length} créneau(x) ignoré(s) (déjà pris ou fermé).`);
    if (res.created > 0) router.push("/admin/reservations");
  }

  if (!resource) return <p className="text-muted-foreground">Aucun espace actif.</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Espace</Label>
          <select
            value={resourceId}
            onChange={(e) => changeResource(e.target.value)}
            className="w-full rounded-lg border border-muted px-3 py-2"
          >
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Formule</Label>
          <div className="flex flex-wrap gap-2">
            {resource.pricings.map((p) => (
              <button
                key={p.unit}
                type="button"
                onClick={() => changeUnit(p.unit)}
                className={`rounded-lg border px-3 py-2 text-sm ${unit === p.unit ? "border-primary bg-primary/10" : "border-muted"}`}
              >
                {p.label ?? p.unit} · {formatEuros(p.priceCents)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {unit === "HOUR" && (
        <div className="space-y-2">
          <Label htmlFor="hour">Heure de début (appliquée à toutes les dates)</Label>
          <select
            id="hour"
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="rounded-lg border border-muted px-3 py-2"
          >
            {Array.from({ length: 9 }, (_, i) => i + 9).map((h) => (
              <option key={h} value={h}>
                {h}h00 – {h + 1}h00
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <Label>{unit === "MONTH" ? "Mois" : "Dates (sélection multiple)"}</Label>
          {unit === "MONTH" ? (
            <div className="flex items-end gap-2">
              <Input type="month" value={monthVal} onChange={(e) => setMonthVal(e.target.value)} />
              <Button type="button" variant="outline" onClick={addMonth}>
                Ajouter
              </Button>
            </div>
          ) : (
            <AvailabilityCalendar
              resourceId={resourceId}
              unit={unit}
              multiple
              selectedKeys={selectedKeys}
              onToggle={toggle}
            />
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 p-3">
            <p className="mb-2 text-sm font-medium">
              Créneaux sélectionnés ({selected.length})
            </p>
            {selected.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {unit === "MONTH" ? "Ajoutez un ou plusieurs mois." : "Cliquez les créneaux dans le calendrier."}
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {selected.map((s) => {
                  const k = slotKey(s);
                  return (
                    <li key={k} className="flex items-center justify-between rounded-md bg-muted px-2 py-1">
                      <span>{slotText(s, unit, hour)}</span>
                      <button
                        type="button"
                        className="text-destructive"
                        onClick={() => setSelected((prev) => prev.filter((x) => slotKey(x) !== k))}
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nom du client</Label>
          <Input id="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Société</Label>
          <Input id="company" value={customer.company} onChange={(e) => setCustomer({ ...customer, company: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Note interne (optionnel)</Label>
        <Textarea id="message" rows={2} value={customer.message} onChange={(e) => setCustomer({ ...customer, message: e.target.value })} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
          />
          Envoyer l&apos;email de confirmation au client (avec le contrat)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          Déjà payé
        </label>
        <button
          type="button"
          onClick={openPreview}
          className="text-sm text-primary underline underline-offset-2 hover:no-underline"
        >
          Aperçu de l&apos;email
        </button>
      </div>

      <Button onClick={submit} disabled={saving || selected.length === 0} className="w-full sm:w-auto">
        {saving ? "Création…" : `Créer ${selected.length || ""} réservation${selected.length > 1 ? "s" : ""}`}
      </Button>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aperçu de l&apos;email</DialogTitle>
            <DialogDescription>
              Mode test — aucun email réel n&apos;est envoyé.
              {preview?.subject ? ` Objet : « ${preview.subject} »` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {PREVIEW_TABS.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => loadPreview(t.type)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  previewType === t.type ? "border-primary bg-primary/10" : "border-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {previewLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Génération de l&apos;aperçu…</p>
          ) : preview ? (
            <iframe
              title="Aperçu de l'email"
              srcDoc={preview.html}
              className="h-[420px] w-full rounded-lg border border-border bg-white"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
