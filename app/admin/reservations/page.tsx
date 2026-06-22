import Link from "next/link";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { StatusBadge } from "@/components/admin/status-badge";
import { PaymentBadge } from "@/components/admin/payment-badge";
import { ReservationActions } from "@/components/admin/reservation-actions";
import { formatEuros, formatDateRange } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; resourceId?: string }>;
}) {
  const { status, resourceId } = await searchParams;

  const where: Prisma.ReservationWhereInput = {};
  if (status) where.status = status as never;
  if (resourceId) where.resourceId = resourceId;

  const [reservations, resources] = await Promise.all([
    prisma.reservation.findMany({ where, orderBy: { startAt: "desc" }, include: { resource: true } }),
    prisma.resource.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const statuses = ["", "PENDING", "CONFIRMED", "REJECTED", "COMPLETED", "CANCELLED"];

  function statusHref(s: string) {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (resourceId) params.set("resourceId", resourceId);
    return params.size ? `/admin/reservations?${params}` : "/admin/reservations";
  }

  function resourceHref(rid: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (rid) params.set("resourceId", rid);
    return params.size ? `/admin/reservations?${params}` : "/admin/reservations";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Réservations</h1>
        <Link
          href="/admin/reservations/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          + Nouvelle réservation
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Link
            key={s || "all"}
            href={statusHref(s)}
            className={`rounded-full border px-3 py-1 text-sm ${status === s || (!status && !s) ? "border-primary bg-primary/10" : "border-muted"}`}
          >
            {s ? <StatusBadge status={s} /> : "Toutes"}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={resourceHref("")}
          className={`rounded-full border px-3 py-1 text-sm ${!resourceId ? "border-primary bg-primary/10" : "border-muted"}`}
        >
          Tous les espaces
        </Link>
        {resources.map((res) => (
          <Link
            key={res.id}
            href={resourceHref(res.id)}
            className={`rounded-full border px-3 py-1 text-sm ${resourceId === res.id ? "border-primary bg-primary/10" : "border-muted"}`}
          >
            {res.name}
          </Link>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Espace</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Créneau</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-foreground/50">Aucune réservation.</TableCell></TableRow>
          )}
          {reservations.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.resource.name}</TableCell>
              <TableCell>
                <Link href={`/admin/reservations/${r.id}`} className="underline">{r.customerName}</Link>
                <div className="text-xs text-foreground/50">{r.customerEmail}</div>
              </TableCell>
              <TableCell className="text-sm">{formatDateRange(r.startAt, r.endAt)}</TableCell>
              <TableCell>{formatEuros(r.totalCents)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1">
                  <StatusBadge status={r.status} />
                  {r.status === "CONFIRMED" && <PaymentBadge status={r.paymentStatus} />}
                </div>
              </TableCell>
              <TableCell>{r.status === "PENDING" && <ReservationActions id={r.id} />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
