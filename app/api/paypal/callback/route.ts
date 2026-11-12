import { NextResponse } from "next/server";
import {
  exchangeCode,
  paypalMode,
  paypalConfigured,
  paypalRedirectUri,
  userInfo,
  verifyState,
  PayPalError,
} from "@/lib/paypal";
import { PAYPAL_COOKIE, cookieOptions, mintSid, readSid } from "@/lib/paypal-session";
import { savePayPalConnection } from "@/lib/paypal-store";
import { UnauthorizedError, requireOwner } from "@/lib/scope";

export const dynamic = "force-dynamic";

/**
 * PayPal speaks in codes. A person who just pressed a button needs the sentence
 * behind the code, so each known code becomes one.
 */
const PLAIN_REASONS: [RegExp, string][] = [
  [/access_denied|cancell?ed/i, "You cancelled at PayPal, so nothing was linked."],
  [/invalid_grant/i, "The sign-in code expired before it reached us. Codes last minutes — press Connect and finish in one go."],
  [/invalid_client|unauthorized_client/i, "PayPal did not recognise this deployment's app. Check the sandbox client id and secret."],
  [/invalid_scope|insufficient_scope/i, "PayPal did not share the email address, so the app cannot show whose account it is. Enable the Email scope on the app."],
  [/invalid_redirect_uri|redirect_uri/i, "PayPal did not accept the return URL. It must be registered exactly on the app."],
  [/not (linked|associated)|consent_required/i, "That PayPal account has not agreed to share its email with this app."],
  [/timed? ?out|fetch failed|ENOTFOUND|EAI_AGAIN|socket/i, "PayPal did not answer in time. Nothing was linked — try again."],
];

function plainReason(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim().slice(0, 240);
  const match = PLAIN_REASONS.find(([pattern]) => pattern.test(text));
  if (match) return match[1];
  /* Unrecognised: keep PayPal's own words, they are the only lead there is. */
  return text || "PayPal reported an error without saying what it was.";
}

async function handleGET(request: Request) {
  const url = new URL(request.url);
  const fail = (reason: string) => {
    const next = new URL("/settings", request.url);
    next.searchParams.set("paypal", "error");
    next.searchParams.set("reason", plainReason(reason));
    return NextResponse.redirect(next);
  };

  if (!paypalConfigured()) return fail("PayPal is not configured on this deployment.");

  const denied = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (denied) return fail(denied);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail("PayPal did not return an authorization code.");

  const sid = verifyState(state);
  if (!sid) return fail("The authorization response could not be verified.");

  try {
    const redirectUri = paypalRedirectUri(request.url);
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
    const reason =
      error instanceof PayPalError
        ? error.message
        : error instanceof Error && error.message
          ? error.message
          : "The PayPal exchange failed.";
    return fail(reason);
  }
}

/**
 * A browser comes back here from PayPal. If the session has gone, send the
 * person to sign in rather than showing them a JSON 401.
 */
export async function GET(request: Request) {
  try {
    return await handleGET(request);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      const next = "/settings?paypal=signed-out";
      return NextResponse.redirect(new URL(`/signin?next=${encodeURIComponent(next)}`, request.url));
    }
    throw error;
  }
}
