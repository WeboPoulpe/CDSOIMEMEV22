import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";
import { CORS_HEADERS } from "@/lib/public-booking";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const careTypeId = searchParams.get("careTypeId");
  const date = searchParams.get("date"); // YYYY-MM-DD
  if (!careTypeId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400, headers: CORS_HEADERS });
  }
  const slots = await getAvailableSlots(careTypeId, date);
  return NextResponse.json({ date, slots }, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}
