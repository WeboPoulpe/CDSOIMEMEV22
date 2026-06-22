import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ResourceForm } from "../resource-form";
import { PricingManager } from "./pricing-manager";
import { ImagesManager } from "./images-manager";

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: { pricings: { orderBy: { sortOrder: "asc" }, include: { tiers: { orderBy: { minQuantity: "asc" } } } } },
  });
  if (!resource) notFound();
  return (
    <div className="max-w-2xl space-y-10">
      <h1 className="font-display text-3xl">Modifier : {resource.name}</h1>
      <ResourceForm resource={{ ...resource }} />
      <ImagesManager resourceId={resource.id} initialImages={resource.images} />
      <PricingManager
        resourceId={resource.id}
        pricings={resource.pricings.map((p) => ({
          id: p.id,
          unit: p.unit,
          priceCents: p.priceCents,
          label: p.label,
          tiers: p.tiers.map((t) => ({ id: t.id, minQuantity: t.minQuantity, priceCents: t.priceCents })),
        }))}
      />
    </div>
  );
}
