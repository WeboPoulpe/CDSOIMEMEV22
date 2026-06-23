import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { NewClienteForm } from "./new-cliente-form";
import { PageHeader } from "@/components/admin/ui";

export default async function NewClientePage() {
  await requireAdmin();
  return (
    <div>
      <PageHeader
        title="Nouvelle cliente"
        subtitle="Crée sa fiche ; elle pourra ensuite activer son espace."
        action={<Link href="/admin/clientes" className="text-sm text-foreground/55 hover:text-foreground">← Toutes les clientes</Link>}
      />
      <NewClienteForm />
    </div>
  );
}
