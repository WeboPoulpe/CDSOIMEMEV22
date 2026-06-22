import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderContractPdf } from "@/lib/contracts/pdf";
import { mergeTemplate } from "@/lib/contracts/merge";
import { buildMergeContext } from "@/lib/contracts/build-context";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({ where: { id }, include: { resource: true, contract: true } });
  if (!reservation) return new Response("Introuvable", { status: 404 });

  const settings = await prisma.settings.findFirst();

  let body = reservation.contract?.bodySnapshot;
  if (!body) {
    const template =
      (await prisma.contractTemplate.findFirst({ where: { active: true, appliesTo: reservation.resource.type } })) ??
      (await prisma.contractTemplate.findFirst({ where: { active: true, appliesTo: null } }));
    body = template ? mergeTemplate(template.body, buildMergeContext({ reservation, resource: reservation.resource, settings })) : "Aucun modèle de contrat disponible.";
  }

  const pdf = await renderContractPdf({ title: "Contrat de réservation", body, businessName: settings?.businessName ?? "Le lieu" });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contrat-${id}.pdf"`,
    },
  });
}
