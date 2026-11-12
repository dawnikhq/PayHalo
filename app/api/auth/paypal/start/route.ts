import { NextResponse } from "next/server";
import { authorizeUrl, paypalConfigured, paypalRedirectUri, signAuthState } from "@/lib/paypal";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/paypal/start — begin a PayPal sign-in or sign-up.
 *
 * PayPal is only asked for the three things needed to recognise a person:
 * who they are, and the address they have already proved to PayPal. Nothing
 * about their money is requested, and the token this returns is used once.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  if (!paypalConfigured()) {
    return NextResponse.redirect(new URL(`/${from(url)}?paypal=unavailable`, request.url));
  }

  const state = signAuthState({
    next: url.searchParams.get("next"),
    origin: url.origin,
    from: url.searchParams.get("from") === "signup" ? "signup" : "signin",
  });

  return NextResponse.redirect(authorizeUrl(paypalRedirectUri(request.url), state));
}

function from(url: URL) {
  return url.searchParams.get("from") === "signup" ? "signup" : "signin";
}
