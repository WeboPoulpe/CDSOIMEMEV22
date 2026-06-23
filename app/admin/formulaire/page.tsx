import { requireAdmin } from "@/lib/auth";
import { getQuestionnaire } from "@/lib/questionnaire";
import { PageHeader } from "@/components/admin/ui";
import { FormEditor } from "./form-editor";

export const dynamic = "force-dynamic";

export default async function FormulairePage() {
  await requireAdmin();
  const def = await getQuestionnaire();
  return (
    <div>
      <PageHeader
        title="Le formulaire"
        subtitle="Personnalise le questionnaire que tu envoies à tes clientes."
      />
      <FormEditor initial={def} />
    </div>
  );
}
