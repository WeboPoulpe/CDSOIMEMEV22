import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { PrestationForm } from "../prestation-form";
import { createPrestationAction } from "../actions";

export default async function NewPrestationPage() {
  await requireAdmin();
  return (
    <div>
      <PageHeader
        title="Nouvelle prestation"
        subtitle="Elle apparaîtra à la réservation si elle est active."
        action={<Link href="/admin/prestations" className="text-sm text-foreground/55 hover:text-foreground">← Prestations</Link>}
      />
      <PrestationForm action={createPrestationAction} submitLabel="Créer la prestation" />
    </div>
  );
}
