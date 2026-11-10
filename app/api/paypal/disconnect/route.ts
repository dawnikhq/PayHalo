import { NextResponse } from "next/server";
import { PAYPAL_COOKIE, readSid } from "@/lib/paypal-session";
import { clearPayPalConnection } from "@/lib/paypal-store";

export const dynamic = "force-dynamic";

export async function POST() {
  const sid = await readSid();
  if (sid) await clearPayPalConnection(sid);

  const response = NextResponse.json({ ok: true, connection: null });
  response.cookies.set(PAYPAL_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
