import { NextResponse } from "next/server";
import { PAYPAL_COOKIE, readSid } from "@/lib/paypal-session";
import { clearPayPalConnection } from "@/lib/paypal-store";
import { requireOwner } from "@/lib/scope";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";

async function handlePOST() {
  const owner = await requireOwner();
  const sid = await readSid();
  if (sid) await clearPayPalConnection(owner.id, sid);

  const response = NextResponse.json({ ok: true, connection: null });
  response.cookies.set(PAYPAL_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export const POST = guarded(handlePOST);
