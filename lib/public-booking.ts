import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getAvailableSlots } from "@/lib/availability";
import { notifyBookingReceived } from "@/lib/notifications";
import { logConsent } from "@/lib/consent";
import { rateLimit } from "@/lib/rate-limit";

/** CORS headers so the booking widget can call the API from cdsoimeme.fr. */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const publicBookingSchema = z.object({
  prenom: z.string().min(1, "Prénom requis"),
  nom: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  telephone: z.string().optional(),
  careTypeId: z.string().min(1, "Prestation requise"),
  requestedDate: z.string().min(1, "Date requise"), // ISO datetime
  notes: z.string().optional(),
  consent: z.boolean().optional(),
  website: z.string().optional(), // honeypot (doit rester vide)
});

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;

/**
 * Public (no-auth) booking. Finds-or-creates the prospect's `profiles` row by
 * email, then records a `pending` booking_request the praticienne validates in
 * /admin/demandes. Shared by the JSON API and the hosted public page.
 */
export async function createPublicBooking(
  raw: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = publicBookingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const d = parsed.data;
  if (d.website && d.website.trim()) return { ok: true }; // honeypot — on ignore silencieusement
  if (!(await rateLimit("booking", 8, 3600))) {
    return { ok: false, error: "Trop de demandes pour le moment. Réessaie un peu plus tard." };
  }
  if (!d.consent) return { ok: false, error: "Merci d'accepter la politique de confidentialité." };

  const care = await prisma.care_types.findFirst({ where: { id: d.careTypeId, actif: true } });
  if (!care) return { ok: false, error: "Prestation introuvable." };

  const date = new Date(d.requestedDate);
  if (isNaN(date.getTime())) return { ok: false, error: "Date invalide." };
  if (date.getTime() < Date.now()) return { ok: false, error: "Choisissez une date à venir." };

  // Re-check the slot is still offered (guards against double-booking / tampering).
  const dateStr = d.requestedDate.slice(0, 10);
  const hm = d.requestedDate.slice(11, 16);
  const slots = await getAvailableSlots(d.careTypeId, dateStr);
  if (!slots.includes(hm)) {
    return { ok: false, error: "Ce créneau n'est plus disponible. Choisissez-en un autre." };
  }

  let profile = await prisma.profiles.findFirst({ where: { email: d.email } });
  if (!profile) {
    profile = await prisma.profiles.create({
      data: {
        id: randomUUID(),
        prenom: d.prenom,
        nom: d.nom,
        email: d.email,
        telephone: d.telephone?.trim() || null,
        statut: "prospect",
      },
    });
  }

  await prisma.booking_requests.create({
    data: {
      cliente_id: profile.id,
      care_type_id: care.id,
      requested_date: date,
      status: "pending",
      notes: d.notes?.trim() || null,
    },
  });

  await logConsent("reservation", d.email);

  await notifyBookingReceived({
    clientEmail: d.email,
    clientName: `${d.prenom} ${d.nom}`.trim(),
    prestation: care.nom,
    date,
  });

  return { ok: true };
}
