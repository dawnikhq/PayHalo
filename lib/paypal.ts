import crypto from "node:crypto";

/**
 * PayPal integration — sandbox first.
 *
 * Three separate things live here, and they have three different trust levels:
 *
 *   1. OAuth ("Log in with PayPal")  → proves which PayPal account a visitor owns.
 *   2. Balance reads                 → needs the reporting/balances scope on the app.
 *   3. Payouts                       → moves money from THIS app's own business
 *                                      account. Sandbox by default; live is a
 *                                      second, explicit opt-in.
 *
 * Nothing in this file is reachable from the browser: only route handlers import it.
 */

export type PayPalMode = "sandbox" | "live";

const API: Record<PayPalMode, string> = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};

const WEB: Record<PayPalMode, string> = {
  sandbox: "https://www.sandbox.paypal.com",
  live: "https://www.paypal.com",
};

/** Scopes we ask a visitor for. Identity only — we never ask to move their money. */
const OAUTH_SCOPE = "openid profile email";

export class PayPalError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "PayPalError";
    this.status = status;
  }
}

export function paypalMode(): PayPalMode {
  return process.env.PAYPAL_ENV?.trim().toLowerCase() === "live" ? "live" : "sandbox";
}

function clientId(): string {
  return process.env.PAYPAL_CLIENT_ID?.trim() ?? "";
}

function clientSecret(): string {
  return process.env.PAYPAL_CLIENT_SECRET?.trim() ?? "";
}

export function paypalConfigured(): boolean {
  return Boolean(clientId() && clientSecret());
}

/**
 * Payouts are opt-in twice: once for sandbox, and again before anything can
 * move real money. A demo deployment can never fire a live transfer by
 * forgetting a flag — it would need both PAYPAL_ENV=live and
 * PAYPAL_ALLOW_LIVE_PAYOUTS=true on purpose.
 */
export function payoutsEnabled(): boolean {
  if (!paypalConfigured()) return false;
  if (process.env.PAYPAL_PAYOUTS_ENABLED?.toLowerCase() !== "true") return false;
  if (paypalMode() === "live" && process.env.PAYPAL_ALLOW_LIVE_PAYOUTS?.toLowerCase() !== "true") return false;
  return true;
}

export function payoutsBlockedReason(): string | null {
  if (!paypalConfigured()) return "PayPal credentials are not set on this deployment.";
  if (process.env.PAYPAL_PAYOUTS_ENABLED?.toLowerCase() !== "true") {
    return "Payouts are switched off. Set PAYPAL_PAYOUTS_ENABLED=true to allow sandbox transfers.";
  }
  if (paypalMode() === "live" && process.env.PAYPAL_ALLOW_LIVE_PAYOUTS?.toLowerCase() !== "true") {
    return "Live payouts are locked. Set PAYPAL_ALLOW_LIVE_PAYOUTS=true only when you mean it.";
  }
  return null;
}

/* ------------------------------------------------------------------ tokens */

type CachedToken = { token: string; expiresAt: number };

declare global {
  var __vivoPayPalToken: CachedToken | undefined;
}

function basicAuth(): string {
  return `Basic ${Buffer.from(`${clientId()}:${clientSecret()}`).toString("base64")}`;
}

async function tokenRequest(
  body: Record<string, string>,
): Promise<{ ok: true; token: string; expiresIn: number; scope: string | null } | { ok: false; status: number; message: string }> {
  const res = await fetch(`${API[paypalMode()]}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(body).toString(),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; scope?: string; error?: string; error_description?: string }
    | null;

  if (!res.ok || !json?.access_token) {
    return {
      ok: false,
      status: res.status,
      message: json?.error_description ?? json?.error ?? `PayPal returned ${res.status}`,
    };
  }

  return { ok: true, token: json.access_token, expiresIn: Number(json.expires_in ?? 0), scope: json.scope ?? null };
}

/** App-level token: identifies this application's own business account. */
export async function appAccessToken(): Promise<string> {
  const cached = globalThis.__vivoPayPalToken;
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const result = await tokenRequest({ grant_type: "client_credentials" });
  if (!result.ok) throw new PayPalError(result.message, result.status);

  globalThis.__vivoPayPalToken = {
    token: result.token,
    expiresAt: Date.now() + Math.max(60, result.expiresIn) * 1000,
  };
  return result.token;
}

/* ---------------------------------------------------------------- balances */

export interface PayPalBalance {
  currency: string;
  total: string;
  available: string;
  primary: boolean;
}

interface BalancesResponse {
  balances?: {
    currency?: string;
    primary?: boolean;
    total_balance?: { value?: string };
    available_balance?: { value?: string };
  }[];
  account_id?: string;
  as_of_time?: string;
}

/**
 * Balance of the app's own business account. Requires the
 * `reporting/balances/read` scope on the PayPal app; without it PayPal answers
 * 403 and the caller turns that into an honest "scope not granted" state.
 */
export async function getAppBalances(currency = "USD"): Promise<{ balances: PayPalBalance[]; accountId: string | null }> {
  const token = await appAccessToken();
  const url = `${API[paypalMode()]}/v1/reporting/balances?currency_code=${encodeURIComponent(currency)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new PayPalError(text.slice(0, 300) || `Balance read failed (${res.status})`, res.status);
  }

  const json = (await res.json().catch(() => ({}))) as BalancesResponse;
  const balances = (json.balances ?? []).map((b) => ({
    currency: b.currency ?? currency,
    total: b.total_balance?.value ?? "0.00",
    available: b.available_balance?.value ?? "0.00",
    primary: Boolean(b.primary),
  }));

  return { balances, accountId: json.account_id ?? null };
}

/* ----------------------------------------------------------------- payouts */

export interface PayoutItem {
  email: string;
  amountCents: number;
  note: string;
  itemId: string;
}

export interface PayoutBatchResult {
  batchId: string | null;
  status: string;
  itemCount: number;
}

function decimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * One batch per release. PayPal wants a unique `sender_batch_id`; we derive it
 * from the claim so a double-click cannot pay twice — the second attempt is
 * rejected by PayPal, and the caller reads that as "already sent".
 */
export async function sendPayoutBatch(
  claimId: number,
  items: PayoutItem[],
  currency = "USD",
): Promise<PayoutBatchResult> {
  if (!payoutsEnabled()) throw new PayPalError(payoutsBlockedReason() ?? "Payouts are disabled", 403);
  if (!items.length) throw new PayPalError("Nothing to pay out", 400);

  const token = await appAccessToken();
  const senderBatchId = `vivo-claim-${claimId}`;

  const res = await fetch(`${API[paypalMode()]}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: senderBatchId,
        email_subject: "A planned handover from VIVO",
        email_message:
          "Someone left instructions for this. This transfer was made from a VIVO sandbox account and is not a real payment.",
      },
      items: items.map((item) => ({
        recipient_type: "EMAIL",
        receiver: item.email,
        amount: { value: decimal(item.amountCents), currency },
        note: item.note.slice(0, 400),
        sender_item_id: item.itemId.slice(0, 63),
      })),
    }),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | { batch_header?: { payout_batch_id?: string; batch_status?: string }; message?: string; name?: string }
    | null;

  if (!res.ok) {
    const message = json?.message ?? json?.name ?? `PayPal rejected the payout (${res.status})`;
    throw new PayPalError(message, res.status);
  }

  return {
    batchId: json?.batch_header?.payout_batch_id ?? null,
    status: json?.batch_header?.batch_status ?? "PENDING",
    itemCount: items.length,
  };
}

/* ------------------------------------------------------------------- oauth */

export function authorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    flowEntry: "static",
    client_id: clientId(),
    response_type: "code",
    scope: OAUTH_SCOPE,
    redirect_uri: redirectUri,
    state,
  });
  return `${WEB[paypalMode()]}/connect?${params.toString()}`;
}

export interface OAuthTokens {
  accessToken: string;
  expiresIn: number;
  scope: string | null;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
  const result = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  if (!result.ok) throw new PayPalError(result.message, result.status);
  return { accessToken: result.token, expiresIn: result.expiresIn, scope: result.scope };
}

export interface PayPalIdentity {
  payerId: string;
  email: string;
  name: string | null;
}

export async function userInfo(accessToken: string): Promise<PayPalIdentity> {
  const res = await fetch(`${API[paypalMode()]}/v1/identity/oauth2/userinfo?schema=openid`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | { user_id?: string; email?: string; name?: string; given_name?: string; family_name?: string }
    | null;

  if (!res.ok || !json) throw new PayPalError(`Could not read the PayPal profile (${res.status})`, res.status);

  const assembled = [json.given_name, json.family_name].filter(Boolean).join(" ");
  const name = json.name ?? (assembled || null);

  return {
    payerId: json.user_id ?? "unknown",
    email: json.email ?? "unknown",
    name: name || null,
  };
}

/* ------------------------------------------------------- signed oauth state */

export function signState(sid: string): string {
  const mac = crypto.createHmac("sha256", clientSecret()).update(sid).digest("base64url").slice(0, 32);
  return `${sid}.${mac}`;
}

export function verifyState(state: string): string | null {
  const [sid, mac] = state.split(".");
  if (!sid || !mac) return null;
  const expected = crypto.createHmac("sha256", clientSecret()).update(sid).digest("base64url").slice(0, 32);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return sid;
}

/* ------------------------------------------------------------ disclosure */

/**
 * The footer tells the truth about this deployment. Before PayPal is wired up
 * nothing leaves the app; once it is, the sentence changes rather than quietly
 * becoming false.
 */
export function footerNote(): string {
  if (!paypalConfigured()) {
    return "Simulation only · No live connections, notices, claims or transfers.";
  }
  if (paypalMode() === "live") {
    return "PayPal lives connected · Estate figures, documents and notices are simulated.";
  }
  return "PayPal sandbox connected · Figures and notices are simulated; transfers run in PayPal's sandbox.";
}
