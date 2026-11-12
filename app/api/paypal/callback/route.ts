import { NextResponse } from "next/server";
import {
  exchangeCode,
  paypalMode,
  paypalConfigured,
  paypalRedirectUri,
  signTicket,
  tryUserInfo,
  verifyAuthState,
  verifyState,
  PayPalError,
  type PayPalAuthState,
} from "@/lib/paypal";
import { PAYPAL_COOKIE, cookieOptions, mintSid, readSid } from "@/lib/paypal-session";
import { savePayPalConnection } from "@/lib/paypal-store";
import { UnauthorizedError, requireOwner } from "@/lib/scope";
import {
  accountByEmail,
  accountById,
  createAccount,
  markEmailVerified,
  markLogin,
  startLoginToken,
} from "@/lib/accounts";
import { payerLink } from "@/lib/paypal-identity";
import { mailConfigured, sendConfirmAddress } from "@/lib/mailer";
import { ensureWallet } from "@/lib/wallet";

export const dynamic = "force-dynamic";

/**
 * PayPal speaks in codes. A person who just pressed a button needs the sentence
 * behind the code, so each known code becomes one.
 */
const PLAIN_REASONS: [RegExp, string][] = [
  [/access_denied|cancell?ed/i, "You cancelled at PayPal, so nothing was linked."],
  [/invalid_grant/i, "The sign-in code expired before it reached us. Codes last minutes — press Connect and finish in one go."],
  [/invalid_client|unauthorized_client/i, "PayPal could not confirm the connection. Nothing was linked — try again."],
  [/invalid_scope|insufficient_scope/i, "PayPal did not share the email address, so there is no account to show. Nothing was linked."],
  [/invalid_redirect_uri|redirect_uri/i, "PayPal did not send you back to the right place. Nothing was linked — try again."],
  [/not (linked|associated)|consent_required/i, "That PayPal account has not agreed to share its email, so nothing could be linked."],
  [/timed? ?out|fetch failed|ENOTFOUND|EAI_AGAIN|socket/i, "PayPal did not answer in time. Nothing was linked — try again."],
];

function plainReason(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim().slice(0, 240);
  const match = PLAIN_REASONS.find(([pattern]) => pattern.test(text));
  if (match) return match[1];
  /* Unrecognised: keep PayPal's own words, they are the only lead there is. */
  return text || "PayPal reported an error without saying what it was.";
}

/* --------------------------------------------------------- signing in -- */

function nameFromEmail(email: string) {
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() ?? "";
  if (!local) return null;
  return local
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .slice(0, 80);
}

/**
 * PayPal as the login itself.
 *
 * The address is the account: PayPal has already proved the person owns it, so
 * there is no confirmation email and no password to invent. A first sign-in
 * makes the account, a later one finds it. The session is opened through a
 * one-time token on whichever host the person started from, because PayPal
 * always returns to the single registered address.
 */
async function handleSignIn(request: Request, url: URL, auth: PayPalAuthState) {
  const back = (code: string) => {
    const target = new URL(`/${auth.from}`, request.url);
    target.searchParams.set("paypal", code);
    if (auth.next !== "/dashboard") target.searchParams.set("next", auth.next);
    return NextResponse.redirect(target);
  };

  const denied = url.searchParams.get("error");
  if (denied) return back(denied === "access_denied" ? "cancelled" : "failed");

  const code = url.searchParams.get("code");
  if (!code) return back("failed");

  let email = "";
  let payerId = "";
  let name: string | null = null;

  try {
    const tokens = await exchangeCode(code, paypalRedirectUri(request.url));
    const identity = await tryUserInfo(tokens.accessToken, tokens.idToken);
    email = (identity?.email ?? "").trim().toLowerCase();
    payerId = identity?.payerId && identity.payerId !== "unknown" ? identity.payerId : "";
    name = identity?.name ?? null;
  } catch {
    return back("failed");
  }

  /*
   * PayPal proved who this is but not where to reach them. That happens when
   * the app has not been granted the Email scope, and it used to end the
   * sign-in on an apology. Instead: if we already know this PayPal account,
   * use the address it is bound to; if we do not, ask for it once, then prove
   * it with the same emailed link a password sign-up uses.
   */
  if (!email) {
    try {
      if (payerId) {
        const known = await payerLink(payerId);
        if (known) {
          const account = await accountById(known.accountId).catch(() => null);
          if (account?.emailVerifiedAt) {
            await markLogin(account.id).catch(() => undefined);
            const token = await startLoginToken(account.id, "signin");
            const landing = new URL("/auth/link", auth.origin);
            landing.searchParams.set("token", token);
            landing.searchParams.set("next", auth.next);
            return NextResponse.redirect(landing);
          }
          if (account && mailConfigured()) {
            /* Bound but never confirmed — send the proof again rather than trust it. */
            const token = await startLoginToken(account.id, "confirm-email", 24 * 60);
            const confirm = new URL(
              `/auth/confirm?token=${encodeURIComponent(token)}&next=${encodeURIComponent(auth.next)}`,
              auth.origin,
            ).toString();
            await sendConfirmAddress(account.email, {
              name: account.name ?? nameFromEmail(account.email) ?? "there",
              url: confirm,
              hours: 24,
            }).catch(() => undefined);
            return back("checkemail");
          }
        }
      }

      const ask = new URL("/auth/paypal", auth.origin);
      ask.searchParams.set(
        "t",
        signTicket({
          pid: payerId,
          name,
          from: auth.from,
          next: auth.next,
          origin: auth.origin,
          iat: Date.now(),
        }),
      );
      return NextResponse.redirect(ask);
    } catch {
      /* The store said no: fall back to the sentence, not a stack trace. */
      return back("noemail");
    }
  }

  try {
    let account = await accountByEmail(email);
    if (!account) {
      const created = await createAccount(email, name?.trim() || nameFromEmail(email), null);
      account = created === "exists" ? await accountByEmail(email) : created;
      /* The demo balance comes with the account, not with the first visit. */
      if (account) await ensureWallet(account).catch(() => undefined);
    }
    if (!account) return back("failed");

    /* PayPal has already proved this address, which is exactly what the
       emailed confirmation link exists to prove. */
    await markEmailVerified(account.id);
    await markLogin(account.id);

    const token = await startLoginToken(account.id, "signin");
    const landing = new URL("/auth/link", auth.origin);
    landing.searchParams.set("token", token);
    landing.searchParams.set("next", auth.next);
    return NextResponse.redirect(landing);
  } catch {
    return back("failed");
  }
}

/* ------------------------------------------------------------ linking -- */

async function handleConnect(request: Request, url: URL, sid: string) {
  const fail = (reason: string) => {
    const next = new URL("/settings", request.url);
    next.searchParams.set("paypal", "error");
    next.searchParams.set("reason", plainReason(reason));
    return NextResponse.redirect(next);
  };

  const denied = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (denied) return fail(denied);

  const code = url.searchParams.get("code");
  if (!code) return fail("PayPal did not return an authorization code.");

  try {
    const redirectUri = paypalRedirectUri(request.url);
    const tokens = await exchangeCode(code, redirectUri);

    /*
     * The sign-in is already granted at this point; asking who it was is a
     * second, separate request that PayPal sometimes refuses (a sandbox app
     * that shares no profile attributes answers 400 on every schema). Losing
     * the name is a cosmetic loss. Losing the connection is not: the account is
     * still identified by the grant itself, so it is linked and the card says
     * the email was not shared.
     */
    const identity = (await tryUserInfo(tokens.accessToken, tokens.idToken)) ?? {
      payerId: "unknown",
      email: "",
      name: null,
    };

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

async function handleGET(request: Request) {
  const url = new URL(request.url);

  if (!paypalConfigured()) {
    const target = new URL(url.searchParams.get("state")?.startsWith("a1.") ? "/signin" : "/settings", request.url);
    target.searchParams.set("paypal", "unavailable");
    return NextResponse.redirect(target);
  }

  const state = url.searchParams.get("state") ?? "";

  /* Which of the two handshakes this is. The tag on the state decides. */
  const auth = verifyAuthState(state);
  if (auth) return handleSignIn(request, url, auth);

  const sid = verifyState(state);
  if (!sid) {
    const next = new URL("/settings", request.url);
    next.searchParams.set("paypal", "error");
    next.searchParams.set("reason", plainReason("The authorization response could not be verified."));
    return NextResponse.redirect(next);
  }

  return handleConnect(request, url, sid);
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
