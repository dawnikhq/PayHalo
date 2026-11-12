import { NextResponse } from "next/server";
import { endSession, sessionAccount } from "@/lib/accounts";
import { clearSessionCookie, readSessionToken } from "@/lib/session";
import { supabaseServer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = await readSessionToken();
  if (token) {
    await sessionAccount(token).catch(() => null);
    await endSession(token).catch(() => undefined);
  }
  await clearSessionCookie();

  /* Dormant Supabase Auth session, in case that path is ever switched on. */
  const client = await supabaseServer();
  if (client) await client.auth.signOut().catch(() => undefined);

  return NextResponse.redirect(new URL("/signin", request.url), { status: 303 });
}
