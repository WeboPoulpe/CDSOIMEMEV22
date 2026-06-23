import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { RequestErasure } from "./request-erasure";

export default async function EspaceConfidentialitePage() {
  await requireClient();
  return (
    <div className="space-y-6">
      <PageHeader title="Mes données" subtitle="Tes informations t'appartiennent." />

      <SectionCard title="Tes droits">
        <p className="text-sm text-foreground/70">
          Tu peux à tout moment accéder à tes informations, les faire corriger, demander leur
          suppression, ou retirer ton consentement. Pour en savoir plus, consulte la{" "}
          <Link href="/legal/confidentialite" className="text-primary underline">politique de confidentialité</Link>.
        </p>
      </SectionCard>

      <SectionCard title="Supprimer mes données">
        <p className="mb-4 text-sm text-foreground/70">
          En faisant cette demande, Charline supprimera ta fiche et toutes les données associées
          (séances, demandes, documents, messages, questionnaire). Cette action est définitive.
        </p>
        <RequestErasure />
      </SectionCard>
    </div>
  );
}
