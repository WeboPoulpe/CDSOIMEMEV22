import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { BookingForm } from "@/components/public/booking-form";
import { ResourceGallery } from "@/components/public/resource-gallery";
import { formatEuros } from "@/lib/utils";

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resource = await prisma.resource.findUnique({
    where: { slug },
    include: {
      pricings: {
        orderBy: { sortOrder: "asc" },
        include: { tiers: { orderBy: { minQuantity: "asc" } } },
      },
    },
  });
  if (!resource || !resource.active) notFound();

  return (
    <div className="space-y-8">
      <Link
        href="/#espaces"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span aria-hidden>←</span> Tous les espaces
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <ResourceGallery
            type={resource.type}
            images={resource.images}
            requiresValidation={resource.requiresValidation}
          />

          <div className="space-y-4">
            <h1 className="font-display text-3xl leading-tight">{resource.name}</h1>
            <p className="text-foreground/70">{resource.description}</p>

            <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border/60 pt-4 text-sm">
              <div>
                <p className="eyebrow mb-1">Capacité</p>
                <p className="font-medium">{resource.capacity} place(s)</p>
              </div>
              <div className="min-w-[12rem]">
                <p className="eyebrow mb-1">Tarifs</p>
                <ul className="space-y-0.5 text-foreground/80">
                  {resource.pricings.map((p) => (
                    <li key={p.id} className="flex justify-between gap-6">
                      <span>{p.label ?? p.unit}</span>
                      <span className="font-medium">{formatEuros(p.priceCents)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <h2 className="mb-1 font-display text-xl">Réserver</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            {resource.requiresValidation
              ? "Envoyez votre demande, le gérant la valide rapidement."
              : "Réservation confirmée immédiatement."}
          </p>
          <BookingForm
            resourceId={resource.id}
            pricings={resource.pricings.map((p) => ({
              unit: p.unit,
              priceCents: p.priceCents,
              label: p.label,
              tiers: p.tiers.map((t) => ({ minQuantity: t.minQuantity, priceCents: t.priceCents })),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
