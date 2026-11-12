import { NextResponse } from "next/server";
import { PAYPAL_COOKIE, readSid } from "@/lib/paypal-session";
import { clearPayPalConnection, getPayPalConnection } from "@/lib/paypal-store";
import { requireOwner } from "@/lib/scope";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";

async function handlePOST() {
  const owner = await requireOwner();
  const sid = await readSid();
  /* Same rule as the status card: the link on screen is the one being removed,
     even if its cookie is gone. */
  const connection = await getPayPalConnection(owner.id, sid);
  if (connection) await clearPayPalConnection(owner.id, connection.sid);

  const response = NextResponse.json({ ok: true, connection: null });
  response.cookies.set(PAYPAL_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export const POST = guarded(handlePOST);
