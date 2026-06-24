import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, FileText, MessageCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clienteName, formatDateTime, bookingStatusOf } from "@/lib/display";
import { answersOf } from "@/lib/questionnaire";
import { Badge } from "@/components/ui/badge";
import { SectionCard, EmptyState } from "@/components/admin/ui";
import { ReplyComposer } from "./reply-composer";
import { AddSeanceForm, AddDocumentForm, DocumentUpload } from "./manage-forms";
import { SendQuestionnaire } from "./send-questionnaire";
import { Tabs } from "./tabs";

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const cliente = await prisma.profiles.findUnique({
    where: { id },
    include: {
      seances: { orderBy: { date: "desc" }, take: 30 },
      booking_requests: { orderBy: { requested_date: "desc" }, include: { care_types: true }, take: 20 },
      documents: { orderBy: { created_at: "desc" } },
      messages: { orderBy: { created_at: "asc" }, take: 80 },
      form_responses: { orderBy: { created_at: "desc" }, take: 1 },
    },
  });
  if (!cliente) notFound();

  // Ouvrir la fiche marque les messages de la cliente comme lus.
  await prisma.messages.updateMany({
    where: { cliente_id: cliente.id, expediteur: "cliente", lu: false },
    data: { lu: true },
  });

  const questionnaire = cliente.form_responses[0];
  const name = clienteName(cliente);
  const initials = name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const pendingDemandes = cliente.booking_requests.filter((b) => b.status === "pending").length;

  const seancesPanel = (
    <SectionCard title="Séances">
      <div className="space-y-2">
        {cliente.seances.length === 0 && <EmptyState>Aucune séance.</EmptyState>}
        {cliente.seances.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
            <span className="font-medium text-foreground">{s.type}</span>
            <span className="text-sm text-foreground/60">{formatDateTime(s.date)}</span>
          </div>
        ))}
        <details className="pt-2 [&_summary]:cursor-pointer">
          <summary className="text-sm font-medium text-primary">+ Planifier une séance</summary>
          <div className="pt-3"><AddSeanceForm clienteId={cliente.id} /></div>
        </details>
      </div>
    </SectionCard>
  );

  const demandesPanel = (
    <SectionCard title="Demandes de rendez-vous">
      <div className="space-y-2">
        {cliente.booking_requests.length === 0 && <EmptyState>Aucune demande.</EmptyState>}
        {cliente.booking_requests.map((b) => {
          const st = bookingStatusOf(b.status);
          return (
            <div key={b.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-muted/50">
              <div>
                <p className="font-medium text-foreground">{b.care_types.nom}</p>
                <p className="text-sm text-foreground/60">{formatDateTime(b.requested_date)}</p>
              </div>
              <Badge variant={st.variant}>{st.label}</Badge>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );

  const messageriePanel = (
    <SectionCard title="Messagerie">
      <div className="space-y-3">
        {cliente.messages.length === 0 && <EmptyState>Aucun message.</EmptyState>}
        {cliente.messages.map((m) => {
          const mine = m.expediteur === "praticienne";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                <p className="whitespace-pre-wrap">{m.contenu}</p>
                <p className={`mt-1 text-xs ${mine ? "text-primary-foreground/70" : "text-foreground/50"}`}>
                  {m.created_at ? formatDateTime(m.created_at) : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div className="pt-2"><ReplyComposer clienteId={cliente.id} /></div>
      </div>
    </SectionCard>
  );

  const documentsPanel = (
    <SectionCard title="Documents">
      <div className="space-y-2">
        {cliente.documents.length === 0 && <EmptyState>Aucun document.</EmptyState>}
        {cliente.documents.map((d) => (
          <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-muted/50">
            <span className="font-medium text-foreground">{d.titre}</span>
            <span className="text-sm text-foreground/55">{d.categorie ?? "Document"}</span>
          </a>
        ))}
        <details className="pt-2 [&_summary]:cursor-pointer">
          <summary className="text-sm font-medium text-primary">+ Partager un document</summary>
          <div className="space-y-4 pt-3">
            <DocumentUpload clienteId={cliente.id} />
            <details className="text-sm [&_summary]:cursor-pointer">
              <summary className="text-foreground/55">ou ajouter par lien externe</summary>
              <div className="pt-2"><AddDocumentForm clienteId={cliente.id} /></div>
            </details>
          </div>
        </details>
      </div>
    </SectionCard>
  );

  const questionnairePanel = (
    <SectionCard title="Questionnaire d'accueil" action={<SendQuestionnaire clienteId={cliente.id} />}>
      {questionnaire ? (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {answersOf(questionnaire as unknown as Record<string, unknown>).map((a, i) => (
            <div key={i}>
              <p className="text-foreground/55">{a.label}</p>
              <p className="mt-0.5 whitespace-pre-wrap">{a.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-foreground/50">
          Pas encore rempli. Envoie-le par email — elle pourra le compléter sans se connecter.
        </p>
      )}
    </SectionCard>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/12 font-serif text-xl text-primary">{initials || "C"}</span>
          <div>
            <h1 className="font-serif text-3xl text-foreground">{name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-foreground/55">
              {cliente.email && <span>{cliente.email}</span>}
              {cliente.statut && <Badge variant="secondary">{cliente.statut}</Badge>}
            </p>
          </div>
        </div>
        <Link href="/admin/clientes" className="text-sm text-foreground/55 hover:text-foreground">← Toutes les clientes</Link>
      </div>
      <div className="hairline-gold h-px w-full opacity-40" />

      <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
        {/* Left rail */}
        <aside className="space-y-4 self-start lg:sticky lg:top-6">
          <SectionCard title="Profil">
            <div className="space-y-1.5 text-sm">
              {cliente.telephone && <p><span className="text-foreground/55">Téléphone : </span>{cliente.telephone}</p>}
              {cliente.ville && <p><span className="text-foreground/55">Ville : </span>{cliente.ville}</p>}
              {cliente.objectif_principal && <p className="pt-1"><span className="text-foreground/55">Objectif : </span>{cliente.objectif_principal}</p>}
              {!cliente.telephone && !cliente.ville && !cliente.objectif_principal && (
                <p className="text-foreground/45">Pas d'informations complémentaires.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Équilibre ressenti">
            <div className="space-y-3">
              <Axis label="Corps" value={cliente.axe_corps} />
              <Axis label="Cœur" value={cliente.axe_coeur} />
              <Axis label="Esprit" value={cliente.axe_esprit} />
            </div>
          </SectionCard>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat icon={CalendarDays} value={cliente.seances.length} label="séances" />
            <Stat icon={FileText} value={cliente.documents.length} label="docs" />
            <Stat icon={MessageCircle} value={cliente.messages.length} label="messages" />
          </div>
        </aside>

        {/* Tabs */}
        <Tabs
          tabs={[
            { key: "seances", label: "Séances", badge: cliente.seances.length, content: seancesPanel },
            { key: "demandes", label: "Demandes", badge: pendingDemandes, content: demandesPanel },
            { key: "questionnaire", label: "Questionnaire", content: questionnairePanel },
            { key: "messagerie", label: "Messagerie", badge: cliente.messages.length, content: messageriePanel },
            { key: "documents", label: "Documents", badge: cliente.documents.length, content: documentsPanel },
          ]}
        />
      </div>
    </div>
  );
}

function Axis({ label, value }: { label: string; value: number | null }) {
  const v = Math.max(0, Math.min(10, value ?? 0));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-foreground/60">
        <span>{label}</span>
        <span>{value ?? "—"}/10</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${v * 10}%` }} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof CalendarDays; value: number; label: string }) {
  return (
    <div className="rounded-xl border border-primary/10 bg-card/70 px-2 py-3">
      <Icon className="mx-auto h-4 w-4 text-primary/70" />
      <p className="mt-1 font-serif text-lg text-foreground">{value}</p>
      <p className="text-xs text-foreground/50">{label}</p>
    </div>
  );
}
