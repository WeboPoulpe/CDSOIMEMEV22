import { auth } from "@/lib/auth";
import { seed } from "@/prisma/seed";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.DEMO_MODE !== "true") {
    return new Response("Reset désactivé hors mode démo.", { status: 403 });
  }
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  await seed();
  return Response.json({ ok: true });
}
