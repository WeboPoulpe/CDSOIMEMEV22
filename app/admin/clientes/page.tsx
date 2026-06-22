import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clienteName } from "@/lib/display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ClientesPage() {
  await requireAdmin();
  const clientes = await prisma.profiles.findMany({
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Clientes</h1>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{clientes.length} cliente(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {clientes.length === 0 ? (
            <p className="text-foreground/50">Aucune cliente pour le moment.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Statut</TableHead>
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
                    <TableCell className="text-foreground/70">{c.statut ?? "—"}</TableCell>
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
