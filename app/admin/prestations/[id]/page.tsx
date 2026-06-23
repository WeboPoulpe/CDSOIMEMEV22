import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { PrestationForm } from "../prestation-form";
import { updatePrestationAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditPrestationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const p = await prisma.care_types.findUnique({ where: { id } });
  if (!p) notFound();

  const action = updatePrestationAction.bind(null, p.id);

  return (
    <div>
      <PageHeader
        title="Modifier la prestation"
        action={<Link href="/admin/prestations" className="text-sm text-foreground/55 hover:text-foreground">← Prestations</Link>}
      />
      <PrestationForm
        action={action}
        submitLabel="Enregistrer les modifications"
        initial={{
          nom: p.nom,
          description: p.description ?? "",
          duree_minutes: p.duree_minutes ?? 60,
          prix: p.prix != null ? Number(p.prix) : 70,
          ordre: p.ordre ?? 0,
          actif: p.actif ?? true,
        }}
      />
    </div>
  );
}
