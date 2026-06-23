import { requireAdmin } from "@/lib/auth";
import { getQuestionnaire } from "@/lib/questionnaire";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { FormEditor } from "./form-editor";
import { PreregisterForm } from "./preregister-form";

export const dynamic = "force-dynamic";

export default async function FormulairePage() {
  await requireAdmin();
  const def = await getQuestionnaire();
  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Le formulaire"
          subtitle="Personnalise le questionnaire que tu envoies à tes clientes."
        />
        <FormEditor initial={def} />
      </div>

      <SectionCard title="Envoyer le formulaire à une nouvelle personne">
        <PreregisterForm />
      </SectionCard>
    </div>
  );
}
