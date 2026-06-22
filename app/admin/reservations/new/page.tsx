import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminBookingForm } from "./admin-booking-form";

export default async function NewReservationPage() {
  const resources = await prisma.resource.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { pricings: { orderBy: { sortOrder: "asc" } } },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Nouvelle réservation</h1>
        <Link
          href="/admin/reservations"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Réservations
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Saisie manuelle : choisissez un espace et une formule, puis sélectionnez un ou plusieurs
        créneaux pour le même client. Les réservations sont créées confirmées (sans email automatique).
      </p>
      <AdminBookingForm
        resources={resources.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          pricings: r.pricings.map((p) => ({ unit: p.unit, label: p.label, priceCents: p.priceCents })),
        }))}
      />
    </div>
  );
}
