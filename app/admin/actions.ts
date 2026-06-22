"use server";

import { signOut, requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SlotUnavailableError } from "@/lib/booking/errors";
import { resourceSchema, pricingSchema } from "@/lib/booking/admin-schema";
import { confirmReservation, sendRejection } from "@/lib/workflow/confirm-reservation";
import { createReservationsBatch, type AdminSlot } from "@/lib/booking/admin-create";
import {
  confirmationEmailHtml,
  requestReceivedEmailHtml,
  rejectionEmailHtml,
  adminNotificationEmailHtml,
} from "@/lib/integrations/email";
import { slotForUnit } from "@/lib/booking/slots";
import { computeTotalCents } from "@/lib/booking/pricing";
import { formatDateRange, formatEuros } from "@/lib/utils";
import type { BookingUnit } from "@prisma/client";

export type EmailPreviewType = "confirmation" | "request" | "rejection" | "admin";

/** Render one of the email templates for a preview (no email is sent). */
export async function previewEmailAction(input: {
  resourceId: string;
  unit: string;
  date?: string;
  half?: "AM" | "PM" | null;
  hour?: number;
  customerName?: string;
  type?: EmailPreviewType;
}): Promise<{ html: string; subject: string } | { error: string }> {
  await requireAdmin();
  const resource = await prisma.resource.findUnique({
    where: { id: input.resourceId },
    include: { pricings: { include: { tiers: true } } },
  });
  if (!resource) return { error: "Espace introuvable." };
  const settings = await prisma.settings.findFirst();
  const businessName = settings?.businessName ?? "Le lieu";
  const pricing = resource.pricings.find((p) => p.unit === input.unit);
  const base = input.date ? new Date(`${input.date}T00:00`) : new Date();
  const slot = slotForUnit(input.unit as BookingUnit, base, {
    half: input.half ?? (input.unit === "HALF_DAY" ? "AM" : undefined),
    hour: input.hour,
  });
  const range = formatDateRange(slot.startAt, slot.endAt);
  const total = pricing
    ? computeTotalCents({
        unit: input.unit as BookingUnit,
        priceCents: pricing.priceCents,
        startAt: slot.startAt,
        endAt: slot.endAt,
        tiers: pricing.tiers.map((t) => ({ minQuantity: t.minQuantity, priceCents: t.priceCents })),
      })
    : 0;

  switch (input.type ?? "confirmation") {
    case "request":
      return {
        html: requestReceivedEmailHtml({ businessName, resourceName: resource.name, range }),
        subject: `Demande reçue — ${resource.name}`,
      };
    case "rejection":
      return {
        html: rejectionEmailHtml({ businessName, resourceName: resource.name }),
        subject: `Votre demande — ${resource.name}`,
      };
    case "admin":
      return {
        html: adminNotificationEmailHtml({
          resourceName: resource.name,
          customerName: input.customerName?.trim() || "Client Exemple",
          range,
        }),
        subject: `Nouvelle demande — ${resource.name}`,
      };
    default:
      return {
        html: confirmationEmailHtml({
          businessName,
          resourceName: resource.name,
          range,
          total: formatEuros(total),
        }),
        subject: `Réservation confirmée — ${resource.name}`,
      };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createReservationsBatchAction(input: {
  resourceId: string;
  unit: string;
  slots: AdminSlot[];
  customer: { name: string; email: string; phone?: string; company?: string; message?: string };
  sendEmail?: boolean;
  paid?: boolean;
}): Promise<{ created: number; failed: { label: string; reason: string }[] } | { error: string }> {
  await requireAdmin();
  if (!input.resourceId) return { error: "Choisissez un espace." };
  if (!input.slots?.length) return { error: "Sélectionnez au moins une date." };
  if (!input.customer?.name?.trim() || !input.customer?.email?.trim())
    return { error: "Le nom et l'email du client sont requis." };
  try {
    const res = await createReservationsBatch({
      resourceId: input.resourceId,
      unit: input.unit as BookingUnit,
      slots: input.slots,
      customer: input.customer,
      paid: input.paid,
    });
    // Optional: run the confirmation workflow (email + contract + calendar) on each
    // created reservation. Best-effort and idempotent — runs after all commits.
    if (input.sendEmail) {
      for (const id of res.createdIds) {
        try {
          await confirmReservation(id);
        } catch (e) {
          console.error("⚠️ Email de confirmation (saisie admin) échoué:", e);
        }
      }
    }
    revalidatePath("/admin/reservations");
    revalidatePath("/admin/calendrier");
    revalidatePath("/admin");
    return { created: res.created, failed: res.failed };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Création impossible." };
  }
}

export async function validateReservationAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUnique({ where: { id }, include: { resource: true } });
      if (!r) throw new Error("Réservation introuvable.");
      if (r.status !== "PENDING") return;

      // Lock the resource row to prevent capacity races with concurrent public bookings
      await tx.$executeRaw`SELECT id FROM "Resource" WHERE id = ${r.resourceId} FOR UPDATE`;

      const activeCount = await tx.reservation.count({
        where: {
          resourceId: r.resourceId,
          id: { not: r.id },
          status: { in: ["PENDING", "CONFIRMED"] },
          startAt: { lt: r.endAt },
          endAt: { gt: r.startAt },
        },
      });
      if (activeCount >= r.resource.capacity) {
        throw new SlotUnavailableError("Le créneau s'est rempli entre-temps.");
      }
      await tx.reservation.update({ where: { id }, data: { status: "CONFIRMED" } });
    });
    // confirmReservation runs AFTER the $transaction above has committed — never inside it.
    await confirmReservation(id);
    revalidatePath("/admin/reservations");
    return {};
  } catch (e) {
    if (e instanceof SlotUnavailableError) return { error: e.message };
    return { error: "Validation impossible." };
  }
}

export async function setReservationPaidAction(
  id: string,
  paid: boolean
): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await prisma.reservation.update({
      where: { id },
      data: { paymentStatus: paid ? "PAID" : "UNPAID" },
    });
    revalidatePath("/admin/reservations");
    revalidatePath(`/admin/reservations/${id}`);
    return {};
  } catch {
    return { error: "Mise à jour du paiement impossible." };
  }
}

export async function cancelReservationAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await prisma.reservation.update({ where: { id }, data: { status: "CANCELLED" } });
    revalidatePath("/admin/reservations");
    revalidatePath(`/admin/reservations/${id}`);
    revalidatePath("/admin/calendrier");
    return {};
  } catch {
    return { error: "Annulation impossible." };
  }
}

export async function rejectReservationAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await prisma.reservation.update({ where: { id }, data: { status: "REJECTED" } });
    // sendRejection runs after the REJECTED status is committed — never inside a transaction.
    await sendRejection(id);
    revalidatePath("/admin/reservations");
    return {};
  } catch {
    return { error: "Refus impossible." };
  }
}

export async function upsertResourceAction(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = resourceSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug"),
    type: formData.get("type"),
    description: formData.get("description"),
    capacity: formData.get("capacity"),
    requiresValidation: formData.get("requiresValidation") === "on",
    active: formData.get("active") === "on",
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { id, ...data } = parsed.data;
  try {
    if (id) await prisma.resource.update({ where: { id }, data: { ...data, description: data.description || null } });
    else await prisma.resource.create({ data: { ...data, description: data.description || null } });
  } catch {
    return { error: "Slug déjà utilisé ou erreur d'enregistrement." };
  }
  revalidatePath("/admin/espaces");
  redirect("/admin/espaces");
}

export async function deleteResourceAction(id: string): Promise<void> {
  await requireAdmin();
  await prisma.resource.update({ where: { id }, data: { active: false } });
  revalidatePath("/admin/espaces");
}

export async function updateResourceImagesAction(
  resourceId: string,
  images: string[]
): Promise<{ error?: string }> {
  await requireAdmin();
  const clean = images
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 12);
  await prisma.resource.update({ where: { id: resourceId }, data: { images: clean } });
  revalidatePath(`/admin/espaces/${resourceId}`);
  return {};
}

export async function upsertPricingAction(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  // The admin types a price in euros (e.g. "250" or "250,50"); store it in cents.
  const rawEuros = String(formData.get("priceEuros") ?? "").replace(",", ".").trim();
  const euros = Number.parseFloat(rawEuros);
  if (!Number.isFinite(euros) || euros < 0) return { error: "Prix invalide." };
  const parsed = pricingSchema.safeParse({
    id: formData.get("id") || undefined,
    resourceId: formData.get("resourceId"),
    unit: formData.get("unit"),
    priceCents: Math.round(euros * 100),
    label: formData.get("label"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { id, ...data } = parsed.data;
  try {
    await prisma.pricing.upsert({
      where: id ? { id } : { resourceId_unit: { resourceId: data.resourceId, unit: data.unit } },
      create: { ...data, label: data.label || null },
      update: { priceCents: data.priceCents, label: data.label || null },
    });
  } catch {
    return { error: "Erreur d'enregistrement du tarif." };
  }
  revalidatePath(`/admin/espaces/${data.resourceId}`);
  return {};
}

export async function upsertPricingTierAction(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const pricingId = String(formData.get("pricingId") || "");
  const minQuantity = Number.parseInt(String(formData.get("minQuantity") || ""), 10);
  const euros = Number.parseFloat(String(formData.get("priceEuros") ?? "").replace(",", ".").trim());
  if (!pricingId) return { error: "Tarif introuvable." };
  if (!Number.isInteger(minQuantity) || minQuantity < 2)
    return { error: "La quantité minimale doit être ≥ 2." };
  if (!Number.isFinite(euros) || euros < 0) return { error: "Prix invalide." };
  const pricing = await prisma.pricing.findUnique({
    where: { id: pricingId },
    select: { resourceId: true },
  });
  if (!pricing) return { error: "Tarif introuvable." };
  try {
    await prisma.pricingTier.upsert({
      where: { pricingId_minQuantity: { pricingId, minQuantity } },
      create: { pricingId, minQuantity, priceCents: Math.round(euros * 100) },
      update: { priceCents: Math.round(euros * 100) },
    });
  } catch {
    return { error: "Erreur d'enregistrement du palier." };
  }
  revalidatePath(`/admin/espaces/${pricing.resourceId}`);
  return {};
}

export async function deletePricingTierAction(id: string, resourceId: string): Promise<void> {
  await requireAdmin();
  await prisma.pricingTier.delete({ where: { id } });
  revalidatePath(`/admin/espaces/${resourceId}`);
}

export async function deletePricingAction(id: string, resourceId: string): Promise<void> {
  await requireAdmin();
  await prisma.pricing.delete({ where: { id } });
  revalidatePath(`/admin/espaces/${resourceId}`);
}

export async function createClosedPeriodAction(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const startAt = new Date(String(formData.get("startAt")));
  const endAt = new Date(String(formData.get("endAt")));
  const reason = String(formData.get("reason") || "");
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || endAt <= startAt) {
    return { error: "Dates invalides." };
  }
  await prisma.closedPeriod.create({ data: { startAt, endAt, reason: reason || null } });
  revalidatePath("/admin/fermetures");
  return {};
}

export async function deleteClosedPeriodAction(id: string): Promise<void> {
  await requireAdmin();
  await prisma.closedPeriod.delete({ where: { id } });
  revalidatePath("/admin/fermetures");
}

export async function saveTemplateAction(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const id = formData.get("id") ? String(formData.get("id")) : undefined;
  const name = String(formData.get("name") || "Modèle de contrat");
  const body = String(formData.get("body") || "");
  if (body.trim().length < 10) return { error: "Le corps du contrat est trop court." };
  if (id) await prisma.contractTemplate.update({ where: { id }, data: { name, body } });
  else await prisma.contractTemplate.create({ data: { name, body, appliesTo: null, active: true } });
  revalidatePath("/admin/contrats");
  return {};
}

export async function saveSettingsAction(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const data = {
    businessName: String(formData.get("businessName") || ""),
    contactEmail: String(formData.get("contactEmail") || ""),
    contactPhone: String(formData.get("contactPhone") || "") || null,
    fromEmail: String(formData.get("fromEmail") || ""),
    address: String(formData.get("address") || "") || null,
  };
  if (!data.businessName || !data.contactEmail || !data.fromEmail) {
    return { error: "Nom, email de contact et email expéditeur sont requis." };
  }
  const existing = await prisma.settings.findFirst();
  if (existing) await prisma.settings.update({ where: { id: existing.id }, data });
  else await prisma.settings.create({ data });
  revalidatePath("/admin/reglages");
  return {};
}
