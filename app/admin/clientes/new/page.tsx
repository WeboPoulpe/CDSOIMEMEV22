import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { NewClienteForm } from "./new-cliente-form";

export default async function NewClientePage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Nouvelle cliente</h1>
        <Link href="/admin/clientes" className="text-sm text-muted-foreground hover:text-foreground">
          ← Toutes les clientes
        </Link>
      </div>
      <NewClienteForm />
    </div>
  );
}
