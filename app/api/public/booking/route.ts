import { NextResponse } from "next/server";
import { createPublicBooking, CORS_HEADERS } from "@/lib/public-booking";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400, headers: CORS_HEADERS });
  }
  const res = await createPublicBooking(body);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 400, headers: CORS_HEADERS });
  }
  return NextResponse.json(
    { ok: true, message: "Votre demande a bien été envoyée. Vous serez recontactée pour confirmer." },
    { status: 201, headers: CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}
