import { NextResponse } from "next/server";
import { exchangeCode, paypalMode, paypalConfigured, userInfo, verifyState, PayPalError } from "@/lib/paypal";
import { PAYPAL_COOKIE, cookieOptions, mintSid, readSid } from "@/lib/paypal-session";
import { savePayPalConnection } from "@/lib/paypal-store";
import { requireOwner } from "@/lib/scope";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/settings?paypal=error&reason=${encodeURIComponent(reason)}`, request.url));

  if (!paypalConfigured()) return fail("PayPal is not configured on this deployment.");

  const denied = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (denied) return fail(denied);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail("PayPal did not return an authorization code.");

  const sid = verifyState(state);
  if (!sid) return fail("The authorization response could not be verified.");

  try {
    const redirectUri = process.env.PAYPAL_REDIRECT_URI?.trim() || new URL("/api/paypal/callback", request.url).toString();
    const tokens = await exchangeCode(code, redirectUri);
    const identity = await userInfo(tokens.accessToken);

    const owner = await requireOwner();
    await savePayPalConnection(owner.id, {
      sid,
      payerId: identity.payerId,
      email: identity.email,
      name: identity.name,
      mode: paypalMode(),
      accessToken: tokens.accessToken,
      scope: tokens.scope,
      connectedAt: new Date().toISOString(),
      expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString() : null,
    });

    const response = NextResponse.redirect(new URL("/settings?paypal=connected", request.url));
    response.cookies.set(PAYPAL_COOKIE, (await readSid()) ?? sid ?? mintSid(), cookieOptions());
    return response;
  } catch (error) {
    const reason = error instanceof PayPalError ? error.message : "The PayPal exchange failed.";
    return fail(reason);
  }
}
