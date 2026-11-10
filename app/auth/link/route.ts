import { NextResponse } from "next/server";
import { redeemLoginToken, startSession } from "@/lib/accounts";
import { setSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * The link itself. One use, twenty minutes, and it signs the holder in only if
 * the token still exists unspent in the database.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  const userId = token ? await redeemLoginToken(token, "signin") : null;
  if (!userId) return NextResponse.redirect(new URL("/signin?link=invalid", request.url));

  await setSessionCookie(await startSession(userId));
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
