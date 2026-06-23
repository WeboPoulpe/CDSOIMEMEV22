import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/** Records a timestamped consent for proof (RGPD). Best-effort, never throws. */
export async function logConsent(context: string, email?: string | null): Promise<void> {
  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  } catch {}
  try {
    await prisma.consent_logs.create({ data: { context, email: email ?? null, ip } });
  } catch (e) {
    console.error("⚠️ consent log:", e);
  }
}
