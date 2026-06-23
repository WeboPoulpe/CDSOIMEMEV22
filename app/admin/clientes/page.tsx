import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clienteName } from "@/lib/display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/ui";
import { StatutSelect, DeleteCliente } from "./cliente-row-actions";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  await requireAdmin();
  const { statut } = await searchParams;

  const where =
    !statut || statut === "toutes"
      ? {}
      : statut === "sans"
        ? { statut: null }
        : { statut };

  const [clientes, all] = await Promise.all([
    prisma.profiles.findMany({ where, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
    prisma.profiles.findMany({ select: { statut: true } }),
  ]);

  const total = all.length;
  const present = Array.from(new Set(all.map((c) => c.statut).filter((s): s is string => !!s))).sort();
  const hasUnset = all.some((c) => !c.statut);

  const chips: { key: string; label: string }[] = [
    { key: "toutes", label: "Toutes" },
    ...present.map((s) => ({ key: s, label: s })),
    ...(hasUnset ? [{ key: "sans", label: "Sans statut" }] : []),
  ];
  const active = statut || "toutes";

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${total} personne(s) accompagnée(s)`}
        action={
          <Link href="/admin/clientes/new" className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5">
            Ajouter une cliente
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {chips.map((c) => {
          const isActive = active === c.key;
          const href = c.key === "toutes" ? "/admin/clientes" : `/admin/clientes?statut=${encodeURIComponent(c.key)}`;
          return (
            <Link
              key={c.key}
              href={href}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "border border-primary/15 text-foreground/65 hover:bg-muted"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      <Card className="rounded-2xl border-primary/10">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground/70">
            {clientes.length} résultat(s)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientes.length === 0 ? (
            <p className="py-2 text-sm text-foreground/45">Aucune cliente pour ce filtre.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/admin/clientes/${c.id}`} className="font-medium hover:underline">
                        {clienteName(c)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-foreground/70">{c.email ?? "—"}</TableCell>
                    <TableCell className="text-foreground/70">{c.ville ?? "—"}</TableCell>
                    <TableCell>
                      <StatutSelect id={c.id} statut={c.statut} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <DeleteCliente id={c.id} name={clienteName(c)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
