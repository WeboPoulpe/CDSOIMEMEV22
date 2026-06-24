import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getEmailService, resetPasswordEmailHtml } from "@/lib/integrations/email";
import { getEmailMessages } from "@/lib/emails-settings";
import { rateLimit } from "@/lib/rate-limit";

const BRAND = "CD soi-même";
const FROM = process.env.AUTH_EMAIL_FROM?.trim() || "cdsoimeme@gmail.com";
const TTL_MS = 60 * 60 * 1000; // 1 heure

function resetUrl(token: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/reinitialiser/${token}`;
}

/**
 * Requests a magic link to (re)set a password. Onboards an unlinked profile by
 * creating its auth user on the fly. Never reveals whether the account exists,
 * except that in DEMO_MODE it returns the link so it can be used without email.
 */
export async function requestPasswordReset(emailRaw: string): Promise<{ ok: boolean; demoLink?: string }> {
  const email = emailRaw.trim();
  if (!email || !email.includes("@")) return { ok: false };
  // Anti-abus : limite les envois par IP, mais renvoie ok (pas d'énumération).
  if (!(await rateLimit("reset", 5, 900))) return { ok: true };

  let user = await prisma.auth_users.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });

  if (!user) {
    // Maybe a cliente whose profile exists but was never connectable → onboard her.
    const profile = await prisma.profiles.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (!profile) return { ok: true }; // pas d'énumération de comptes
    user = await prisma.auth_users.create({
      data: { email, name: [profile.prenom, profile.nom].filter(Boolean).join(" ") || null },
    });
    await prisma.user_roles.create({ data: { user_id: user.id, role: "cliente" } }).catch(() => {});
    await prisma.profiles.update({ where: { id: profile.id }, data: { auth_user_id: user.id } });
  }

  const token = randomBytes(32).toString("hex");
  await prisma.auth_verification_tokens.deleteMany({ where: { identifier: user.email } });
  await prisma.auth_verification_tokens.create({
    data: { identifier: user.email, token, expires: new Date(Date.now() + TTL_MS) },
  });

  const url = resetUrl(token);
  try {
    const mail = getEmailService({ fromEmail: FROM, fromName: BRAND });
    const msg = (await getEmailMessages()).reset;
    await mail.send({
      to: user.email,
      toName: user.name ?? undefined,
      subject: msg.subject,
      html: resetPasswordEmailHtml({ businessName: BRAND, url, name: user.name ?? "", intro: msg.intro }),
    });
  } catch (e) {
    console.error("⚠️ email réinitialisation:", e);
  }

  const demo = process.env.DEMO_MODE === "true";
  return { ok: true, demoLink: demo ? url : undefined };
}

/** Returns the account email for a valid, unexpired token, else null. */
export async function getResetTokenEmail(token: string): Promise<string | null> {
  const row = await prisma.auth_verification_tokens.findFirst({ where: { token } });
  if (!row || row.expires.getTime() < Date.now()) return null;
  return row.identifier;
}

/** Sets a new password from a valid token, then consumes all tokens for that email. */
export async function resetPasswordWithToken(
  token: string,
  password: string
): Promise<{ ok?: boolean; error?: string }> {
  if (password.length < 8) return { error: "8 caractères minimum." };
  const row = await prisma.auth_verification_tokens.findFirst({ where: { token } });
  if (!row || row.expires.getTime() < Date.now()) return { error: "Lien invalide ou expiré." };
  const user = await prisma.auth_users.findFirst({
    where: { email: { equals: row.identifier, mode: "insensitive" } },
  });
  if (!user) return { error: "Compte introuvable." };
  await prisma.auth_users.update({ where: { id: user.id }, data: { password: await bcrypt.hash(password, 10) } });
  await prisma.auth_verification_tokens.deleteMany({ where: { identifier: row.identifier } });
  return { ok: true };
}
