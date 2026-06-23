"use server";

import { signOut, requireClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentClienteProfile } from "@/lib/espace";
import { getEmailService } from "@/lib/integrations/email";

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

const PRATICIENNE = process.env.AUTH_EMAIL_FROM?.trim() || "cdsoimeme@gmail.com";

/** RGPD — self-service erasure request. Notifies the praticienne (email + in-app). */
export async function requestErasureAction(): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireClient();
  const profile = await currentClienteProfile(session.user.id);
  if (!profile) return { error: "Profil introuvable." };

  const name = [profile.prenom, profile.nom].filter(Boolean).join(" ") || profile.email || "Une cliente";
  const body = `${name}${profile.email ? ` (${profile.email})` : ""} demande la suppression de ses données personnelles.`;

  try {
    const mail = getEmailService({ fromEmail: PRATICIENNE, fromName: "CD soi-même" });
    await mail.send({
      to: PRATICIENNE,
      subject: `Demande de suppression de données — ${name}`,
      html: `<p>${body}</p><p>Tu peux y donner suite depuis la fiche cliente (bouton « Supprimer »).</p>`,
    });
  } catch (e) {
    console.error("⚠️ email demande effacement:", e);
  }

  try {
    const prats = await prisma.user_roles.findMany({ where: { role: "praticienne" }, select: { user_id: true } });
    for (const r of prats) {
      await prisma.notifications.create({
        data: { user_id: r.user_id, type: "erasure_request", title: "Demande de suppression de données", body, related_id: profile.id },
      });
    }
  } catch (e) {
    console.error("⚠️ notif demande effacement:", e);
  }

  return { ok: true };
}
