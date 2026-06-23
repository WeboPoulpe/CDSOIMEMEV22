import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clienteName, formatDateTime, bookingStatusOf } from "@/lib/display";
import { answersOf } from "@/lib/questionnaire";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReplyComposer } from "./reply-composer";
import { AddSeanceForm, AddDocumentForm, DocumentUpload } from "./manage-forms";
import { SendQuestionnaire } from "./send-questionnaire";
import { PageHeader } from "@/components/admin/ui";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const cliente = await prisma.profiles.findUnique({
    where: { id },
    include: {
      seances: { orderBy: { date: "desc" }, take: 20 },
      booking_requests: { orderBy: { requested_date: "desc" }, include: { care_types: true }, take: 20 },
      documents: { orderBy: { created_at: "desc" } },
      messages: { orderBy: { created_at: "asc" }, take: 50 },
      form_responses: { orderBy: { created_at: "desc" }, take: 1 },
    },
  });
  if (!cliente) notFound();

  const questionnaire = cliente.form_responses[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={clienteName(cliente)}
        subtitle={[cliente.email, cliente.ville].filter(Boolean).join(" · ") || undefined}
        action={<Link href="/admin/clientes" className="text-sm text-foreground/55 hover:text-foreground">← Toutes les clientes</Link>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-lg lg:col-span-1">
          <CardHeader><CardTitle>Coordonnées</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {cliente.email && <p><span className="text-foreground/60">Email :</span> {cliente.email}</p>}
            {cliente.telephone && <p><span className="text-foreground/60">Téléphone :</span> {cliente.telephone}</p>}
            {cliente.ville && <p><span className="text-foreground/60">Ville :</span> {cliente.ville}</p>}
            {cliente.statut && <p><span className="text-foreground/60">Statut :</span> {cliente.statut}</p>}
            {cliente.objectif_principal && (
              <p className="pt-2"><span className="text-foreground/60">Objectif :</span> {cliente.objectif_principal}</p>
            )}
            <div className="flex gap-3 pt-3 text-xs text-foreground/60">
              <span>Corps {cliente.axe_corps ?? "—"}</span>
              <span>Cœur {cliente.axe_coeur ?? "—"}</span>
              <span>Esprit {cliente.axe_esprit ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg lg:col-span-2">
          <CardHeader><CardTitle>Séances ({cliente.seances.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cliente.seances.length === 0 && <p className="text-foreground/50">Aucune séance.</p>}
            {cliente.seances.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span className="font-medium">{s.type}</span>
                <span className="text-sm text-foreground/60">{formatDateTime(s.date)}</span>
              </div>
            ))}
            <details className="pt-2">
              <summary className="cursor-pointer text-sm text-primary">+ Ajouter une séance</summary>
              <div className="pt-3"><AddSeanceForm clienteId={cliente.id} /></div>
            </details>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Demandes de rendez-vous</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {cliente.booking_requests.length === 0 && <p className="text-foreground/50">Aucune demande.</p>}
          {cliente.booking_requests.map((b) => {
            const st = bookingStatusOf(b.status);
            return (
              <div key={b.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted">
                <div>
                  <p className="font-medium">{b.care_types.nom}</p>
                  <p className="text-sm text-foreground/60">{formatDateTime(b.requested_date)}</p>
                </div>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <CardTitle>Questionnaire d'accueil</CardTitle>
          <SendQuestionnaire clienteId={cliente.id} />
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Messagerie</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {cliente.messages.length === 0 && <p className="text-foreground/50">Aucun message.</p>}
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
          <ReplyComposer clienteId={cliente.id} />
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Documents ({cliente.documents.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {cliente.documents.length === 0 && <p className="text-foreground/50">Aucun document.</p>}
          {cliente.documents.map((d) => (
            <a
              key={d.id}
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted"
            >
              <span className="font-medium">{d.titre}</span>
              <span className="text-sm text-foreground/60">{d.categorie ?? "Document"}</span>
            </a>
          ))}
          <details className="pt-2">
            <summary className="cursor-pointer text-sm text-primary">+ Partager un document</summary>
            <div className="space-y-4 pt-3">
              <DocumentUpload clienteId={cliente.id} />
              <details className="text-sm">
                <summary className="cursor-pointer text-foreground/55">ou ajouter par lien externe</summary>
                <div className="pt-2"><AddDocumentForm clienteId={cliente.id} /></div>
              </details>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

