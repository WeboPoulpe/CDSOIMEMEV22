import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEmailService, reminderHtml } from "@/lib/integrations/email";
import { rdvDateLabel } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/** Daily reminder for tomorrow's séances. Scheduled via vercel.json crons. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const key = new URL(req.url).searchParams.get("key");
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  const seances = await prisma.seances.findMany({
    where: { date: { gte: start, lte: end } },
    include: { profiles: true },
  });

  const mail = getEmailService({
    fromEmail: process.env.AUTH_EMAIL_FROM?.trim() || "cdsoimeme@gmail.com",
    fromName: "CD soi-même",
  });

  let sent = 0;
  for (const s of seances) {
    const email = s.profiles?.email || s.email_externe;
    if (!email) continue;

    // Dédoublonnage (pour les clientes inscrites) via la table rappels.
    if (s.cliente_id) {
      const already = await prisma.rappels.count({ where: { cliente_id: s.cliente_id, action: `reminder:${s.id}` } });
      if (already > 0) continue;
    }

    const name = [s.profiles?.prenom, s.profiles?.nom].filter(Boolean).join(" ") || s.nom_externe || "";
    try {
      await mail.send({
        to: email,
        toName: name || undefined,
        subject: "Rappel de ton rendez-vous — CD soi-même",
        html: reminderHtml({ businessName: "CD soi-même", clientName: name, type: s.type, dateLabel: rdvDateLabel(s.date) }),
      });
      if (s.cliente_id) {
        await prisma.rappels.create({ data: { cliente_id: s.cliente_id, action: `reminder:${s.id}`, statut: "fait" } });
      }
      sent++;
    } catch (e) {
      console.error("⚠️ rappel non envoyé:", e);
    }
  }

  return NextResponse.json({ ok: true, scanned: seances.length, sent });
}
