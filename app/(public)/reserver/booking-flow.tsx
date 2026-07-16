"use client";

import { useEffect, useState } from "react";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isBefore,
  isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Prestation = {
  id: string;
  nom: string;
  description: string | null;
  dureeMinutes: number | null;
  prix: number | null;
  imageUrl: string | null;
};

type Step = "prestation" | "creneau" | "infos" | "done";

export function BookingFlow({ prestations }: { prestations: Prestation[] }) {
  const [step, setStep] = useState<Step>("prestation");
  const [presta, setPresta] = useState<Prestation | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", telephone: "", notes: "", website: "" });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Auto-hauteur en iframe : publie la hauteur du contenu au site parent
  // (postMessage) à chaque changement de taille/d'étape. Ignoré hors iframe.
  useEffect(() => {
    if (window.parent === window) return;
    const post = () =>
      window.parent.postMessage(
        { type: "cdsoimeme:reserver:height", height: document.documentElement.scrollHeight },
        "*"
      );
    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!presta || !date || !time) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, consent, careTypeId: presta.id, requestedDate: `${date}T${time}` }),
      });
      const out = await res.json();
      if (!res.ok) setError(out.error ?? "Une erreur est survenue.");
      else setStep("done");
    } catch {
      setError("Connexion impossible. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative isolate overflow-hidden">
      <div className="aura-wrap" aria-hidden="true">
        <div className="aura-blob aura-1" />
        <div className="aura-blob aura-3" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-5xl gap-8 px-5 py-14 lg:grid-cols-[0.85fr_1.15fr]">
        <VisualPanel presta={presta} date={date} time={time} step={step} />

        <div className="surface-soft rounded-[1.75rem] p-6 sm:p-8">
          {step === "prestation" && (
            <Section title="Choisis ta prestation" sub="Chaque accompagnement a sa durée et son tarif.">
              <div className="space-y-3">
                {prestations.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setPresta(p); setDate(null); setTime(null); setStep("creneau"); }}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-primary/12 bg-card/60 px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30"
                  >
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif text-lg text-foreground">{p.nom}</span>
                      {p.description && <span className="mt-0.5 block text-sm leading-snug text-foreground/55">{p.description}</span>}
                    </span>
                    <span className="ml-2 shrink-0 text-right text-sm text-foreground/70">
                      {p.dureeMinutes ? <span className="block">{p.dureeMinutes} min</span> : null}
                      {p.prix != null ? <span className="block font-medium text-primary">{p.prix} €</span> : null}
                    </span>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {step === "creneau" && presta && (
            <Section
              title="Choisis un créneau"
              sub={`${presta.nom} · ${presta.dureeMinutes ?? 60} min`}
              onBack={() => setStep("prestation")}
            >
              <SlotPicker
                careTypeId={presta.id}
                selectedDate={date}
                selectedTime={time}
                onPick={(d, t) => { setDate(d); setTime(t); setStep("infos"); }}
              />
            </Section>
          )}

          {step === "infos" && presta && date && time && (
            <Section
              title="Tes coordonnées"
              sub="Pour que Charline puisse te recontacter et confirmer."
              onBack={() => setStep("creneau")}
            >
              <form
                onSubmit={(e) => { e.preventDefault(); submit(); }}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldInput label="Prénom" value={form.prenom} onChange={set("prenom")} required />
                  <FieldInput label="Nom" value={form.nom} onChange={set("nom")} required />
                  <FieldInput label="Email" type="email" value={form.email} onChange={set("email")} required />
                  <FieldInput label="Téléphone (optionnel)" value={form.telephone} onChange={set("telephone")} />
                </div>
                <div className="space-y-2">
                  <Label>Un mot pour Charline (optionnel)</Label>
                  <Textarea value={form.notes} onChange={set("notes")} rows={3} />
                </div>
                {/* honeypot anti-bot — laissé vide par les humains */}
                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={set("website")}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute left-[-9999px] h-0 w-0 opacity-0"
                />
                <label className="flex items-start gap-2.5 text-sm text-foreground/65">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4" required />
                  <span>
                    J'accepte que mes informations soient utilisées pour traiter ma demande, conformément à la{" "}
                    <a href="/legal/confidentialite" target="_blank" rel="noreferrer" className="text-primary underline">politique de confidentialité</a>.
                  </span>
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={pending || !consent} className="w-full sm:w-auto">
                  {pending ? "Envoi…" : "Confirmer ma demande"}
                </Button>
              </form>
            </Section>
          )}

          {step === "done" && (
            <div className="py-10 text-center">
              <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-primary/12 text-primary">
                <Check className="h-6 w-6" />
              </span>
              <h2 className="font-serif text-2xl text-foreground">Demande envoyée 🌸</h2>
              <p className="mx-auto mt-3 max-w-sm text-foreground/60">
                Merci {form.prenom || ""} ! Charline te recontacte très vite pour confirmer ton
                rendez-vous.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Sub-components ─────────── */

function Section({
  title, sub, onBack, children,
}: { title: string; sub?: string; onBack?: () => void; children: React.ReactNode }) {
  return (
    <div>
      {onBack && (
        <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-foreground/55 hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Retour
        </button>
      )}
      <h2 className="font-serif text-2xl text-foreground">{title}</h2>
      {sub && <p className="mt-1 text-sm text-foreground/55">{sub}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function FieldInput({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  );
}

function SlotPicker({
  careTypeId, selectedDate, selectedTime, onPick,
}: {
  careTypeId: string;
  selectedDate: string | null;
  selectedTime: string | null;
  onPick: (date: string, time: string) => void;
}) {
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(startOfMonth(today));
  const [activeDate, setActiveDate] = useState<string | null>(selectedDate);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });

  async function pickDay(d: Date) {
    const ds = format(d, "yyyy-MM-dd");
    setActiveDate(ds);
    setSlots(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/public/availability?careTypeId=${careTypeId}&date=${ds}`);
      const out = await res.json();
      setSlots(Array.isArray(out.slots) ? out.slots : []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  const canPrev = isBefore(startOfMonth(today), cursor);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/12 bg-card/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" disabled={!canPrev} onClick={() => setCursor(addMonths(cursor, -1))} className="grid h-8 w-8 place-items-center rounded-full text-foreground/60 enabled:hover:bg-muted disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-serif text-lg capitalize">{format(cursor, "MMMM yyyy", { locale: fr })}</span>
          <button type="button" onClick={() => setCursor(addMonths(cursor, 1))} className="grid h-8 w-8 place-items-center rounded-full text-foreground/60 hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-foreground/40">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} className="py-1">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const ds = format(d, "yyyy-MM-dd");
            const dow = d.getDay();
            const disabled = isBefore(d, today) || dow === 0 || dow === 6 || !isSameMonth(d, cursor);
            const active = activeDate === ds;
            const isToday = isSameDay(d, today);
            return (
              <button
                key={ds}
                type="button"
                disabled={disabled}
                onClick={() => pickDay(d)}
                className={[
                  "aspect-square rounded-lg text-sm transition-colors",
                  disabled ? "text-foreground/20" : "text-foreground hover:bg-muted",
                  active ? "bg-primary text-primary-foreground hover:bg-primary" : "",
                  isToday && !active ? "ring-1 ring-primary/40" : "",
                ].join(" ")}
              >
                {format(d, "d")}
              </button>
            );
          })}
        </div>
      </div>

      {activeDate && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm text-foreground/60">
            <Clock className="h-4 w-4" />
            <span className="capitalize">{format(new Date(`${activeDate}T12:00`), "EEEE d MMMM", { locale: fr })}</span>
          </p>
          {loading ? (
            <p className="text-sm text-foreground/50">Recherche des créneaux…</p>
          ) : slots && slots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {slots.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onPick(activeDate, t)}
                  className={[
                    "rounded-full border px-4 py-2 text-sm transition-colors",
                    selectedTime === t && selectedDate === activeDate
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-primary/25 text-foreground hover:border-primary hover:bg-primary/5",
                  ].join(" ")}
                >
                  {t}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground/50">Pas de disponibilité ce jour-là — choisis-en un autre 🌿</p>
          )}
        </div>
      )}
    </div>
  );
}

function VisualPanel({
  presta, date, time, step,
}: { presta: Prestation | null; date: string | null; time: string | null; step: Step }) {
  // Tries the real portrait first; falls back to the branded SVG placeholder.
  const [src, setSrc] = useState("/photos/charline-sourire.webp");
  return (
    <div className="relative hidden overflow-hidden rounded-[1.75rem] lg:block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Charline — CD soi-même"
        onError={() => setSrc("/charline.svg")}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/55 via-foreground/10 to-transparent" />
      <div className="relative flex h-full min-h-[26rem] flex-col justify-between p-7 text-primary-foreground">
        <div>
          <p className="font-serif text-2xl leading-snug drop-shadow-sm">
            Un espace pour se poser, souffler et mieux se comprendre.
          </p>
          {(presta || date) && (
            <div className="mt-5 space-y-1 rounded-2xl bg-white/15 p-4 text-sm backdrop-blur">
              <p className="text-white/70">Ta réservation</p>
              {presta && <p className="font-medium">{presta.nom}</p>}
              {date && (
                <p className="capitalize">
                  {format(new Date(`${date}T12:00`), "EEEE d MMMM", { locale: fr })}
                  {time ? ` · ${time}` : ""}
                </p>
              )}
            </div>
          )}
          <StepDots step={step} />
        </div>
      </div>
    </div>
  );
}

function StepDots({ step }: { step: Step }) {
  const order: Step[] = ["prestation", "creneau", "infos"];
  const idx = step === "done" ? 3 : order.indexOf(step);
  return (
    <div className="mt-5 flex gap-1.5">
      {order.map((_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i <= idx ? "w-6 bg-white" : "w-3 bg-white/40"}`} />
      ))}
    </div>
  );
}
