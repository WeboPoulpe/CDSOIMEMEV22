import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function EspacesPage() {
  const resources = await prisma.resource.findMany({
    orderBy: { sortOrder: "asc" },
    include: { pricings: true, _count: { select: { reservations: true } } },
  });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Espaces</h1>
        <Link href="/admin/espaces/new" className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80">+ Nouvel espace</Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead><TableHead>Type</TableHead><TableHead>Capacité</TableHead>
            <TableHead>Validation</TableHead><TableHead>Tarifs</TableHead><TableHead>Actif</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.map((r) => (
            <TableRow key={r.id}>
              <TableCell><Link href={`/admin/espaces/${r.id}`} className="underline">{r.name}</Link></TableCell>
              <TableCell>{r.type}</TableCell>
              <TableCell>{r.capacity}</TableCell>
              <TableCell>{r.requiresValidation ? "Requise" : "Auto"}</TableCell>
              <TableCell>{r.pricings.length}</TableCell>
              <TableCell>{r.active ? <Badge className="bg-secondary text-secondary-foreground">Oui</Badge> : <Badge variant="outline">Non</Badge>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
