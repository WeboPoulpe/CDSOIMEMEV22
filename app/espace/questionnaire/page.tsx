import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";
import { getQuestionnaire, answersOf } from "@/lib/questionnaire";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { DynamicQuestionnaireForm } from "@/components/dynamic-questionnaire-form";
import { submitQuestionnaireAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function QuestionnairePage() {
  const session = await requireClient();
  const [profile, def] = await Promise.all([currentClienteProfile(session.user.id), getQuestionnaire()]);
  const existing = profile
    ? await prisma.form_responses.findFirst({ where: { client_id: profile.id }, orderBy: { created_at: "desc" } })
    : null;
  const answers = existing ? answersOf(existing as unknown as Record<string, unknown>) : [];

  return (
    <div>
      <PageHeader title={def.title} subtitle="Quelques questions pour préparer au mieux ton accompagnement." />

      {existing ? (
        <SectionCard title="Ton questionnaire a bien été transmis 🌸">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {answers.map((a, i) => (
              <div key={i}>
                <p className="text-foreground/55">{a.label}</p>
                <p className="mt-0.5 whitespace-pre-wrap">{a.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : (
        <SectionCard>
          {def.intro && <p className="mb-5 text-foreground/65">{def.intro}</p>}
          <DynamicQuestionnaireForm
            fields={def.fields}
            defaults={{
              prenom: profile?.prenom ?? "",
              nom: profile?.nom ?? "",
              email: profile?.email ?? "",
              telephone: profile?.telephone ?? "",
            }}
            submit={submitQuestionnaireAction}
          />
        </SectionCard>
      )}
    </div>
  );
}
