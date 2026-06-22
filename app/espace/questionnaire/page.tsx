import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestionnaireForm } from "./questionnaire-form";

export default async function QuestionnairePage() {
  const session = await requireClient();
  const profile = await currentClienteProfile(session.user.id);
  const existing = profile
    ? await prisma.form_responses.findFirst({
        where: { client_id: profile.id },
        orderBy: { created_at: "desc" },
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Questionnaire d'accueil</h1>
        <p className="text-foreground/60">
          Quelques questions pour préparer au mieux votre accompagnement.
        </p>
      </div>

      {existing ? (
        <Card className="rounded-lg">
          <CardHeader><CardTitle>Votre questionnaire a bien été transmis 🌸</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Raison du rendez-vous" value={existing.raison_rdv} />
            <Row label="Objectif" value={existing.objectif} />
            <Row label="Causes" value={existing.causes} />
            <Row label="Conséquences" value={existing.consequences} />
            <Row label="Obstacles" value={existing.obstacles} />
            <Row label="Ressources" value={existing.ressources} />
            <Row label="Besoins" value={existing.besoins} />
            <Row label="Échéance" value={existing.echeance} />
          </CardContent>
        </Card>
      ) : (
        <QuestionnaireForm
          defaults={{
            prenom: profile?.prenom ?? "",
            nom: profile?.nom ?? "",
            email: profile?.email ?? "",
            telephone: profile?.telephone ?? "",
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-foreground/55">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  );
}
