import { prisma } from "@/lib/db";
import { TemplateEditor } from "./template-editor";

export default async function ContratsPage() {
  const template = await prisma.contractTemplate.findFirst({
    where: { active: true, appliesTo: null },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Modèle de contrat</h1>
        <p className="text-sm text-foreground/60">
          Cliquez un champ pour l&apos;insérer. Il sera rempli automatiquement à
          la confirmation.
        </p>
      </div>
      <TemplateEditor
        template={
          template
            ? { id: template.id, name: template.name, body: template.body }
            : undefined
        }
      />
    </div>
  );
}
