import { headers } from "next/headers";
import { prisma } from "@/lib/db";

async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Sliding-window rate limit backed by the DB (works across serverless instances).
 * Returns true if the call is allowed, false if the limit is reached.
 */
export async function rateLimit(action: string, max: number, windowSec: number): Promise<boolean> {
  const ip = await clientIp();
  const bucket = `${action}:${ip}`;
  const since = new Date(Date.now() - windowSec * 1000);
  try {
    await prisma.rate_limits.deleteMany({ where: { bucket, created_at: { lt: since } } });
    const count = await prisma.rate_limits.count({ where: { bucket } });
    if (count >= max) return false;
    await prisma.rate_limits.create({ data: { bucket } });
    return true;
  } catch {
    // On DB error, fail open (don't block legitimate users).
    return true;
  }
}
