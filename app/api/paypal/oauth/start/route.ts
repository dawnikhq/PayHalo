import { NextResponse } from "next/server";
import { authorizeUrl, paypalConfigured, signState } from "@/lib/paypal";
import { PAYPAL_COOKIE, cookieOptions, mintSid, readSid } from "@/lib/paypal-session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!paypalConfigured()) {
    return NextResponse.redirect(new URL("/settings?paypal=unconfigured", request.url));
  }

  const sid = (await readSid()) ?? mintSid();
  const redirectUri = process.env.PAYPAL_REDIRECT_URI?.trim() || new URL("/api/paypal/callback", request.url).toString();

  const response = NextResponse.redirect(authorizeUrl(redirectUri, signState(sid)));
  response.cookies.set(PAYPAL_COOKIE, sid, cookieOptions());
  return response;
}
