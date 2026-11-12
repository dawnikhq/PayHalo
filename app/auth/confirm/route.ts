import { NextResponse } from "next/server";
import { accountById, markEmailVerified, redeemLoginToken, startSession } from "@/lib/accounts";
import { setSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * The confirmation link.
 *
 * Opening it is the proof: the person can read the address we hold. The account
 * is marked confirmed, a session is opened on the spot, and they land in the
 * first-run flow rather than a sign-in form.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  const userId = token ? await redeemLoginToken(token, "confirm-email") : null;
  if (!userId) return NextResponse.redirect(new URL("/signin?confirm=expired", request.url));

  const account = await accountById(userId);
  if (!account) return NextResponse.redirect(new URL("/signin?confirm=expired", request.url));

  await markEmailVerified(userId);
  await setSessionCookie(await startSession(userId));

  return NextResponse.redirect(new URL("/onboarding?confirmed=1", request.url));
}
