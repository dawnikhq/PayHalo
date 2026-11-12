import { NextResponse } from "next/server";
import { markEmailVerified, redeemLoginToken, startSession } from "@/lib/accounts";
import { setSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * The link itself. One use, twenty minutes, and it signs the holder in only if
 * the token still exists unspent in the database.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const rawNext = url.searchParams.get("next") ?? "";
  /* where to land after signing in — only ever a path on this site */
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext.slice(0, 200) : "/dashboard";

  const userId = token ? await redeemLoginToken(token, "signin") : null;
  if (!userId) return NextResponse.redirect(new URL("/signin?link=invalid", request.url));

  // opening a link sent to the address is proof of the address
  await markEmailVerified(userId);
  await setSessionCookie(await startSession(userId));
  return NextResponse.redirect(new URL(next, request.url));
}
