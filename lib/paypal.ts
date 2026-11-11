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

/**
 * The release passcode. Deliberately not optional: if it is missing, payouts
 * stay off. A demo with no login in front of it must not be one env var away
 * from moving money, so "not configured" has to fail closed, not open.
 */
export function releasePasscodeConfigured(): boolean {
  return Boolean(process.env.PAYPAL_PAYOUT_PASSCODE?.trim());
}

const digest = (value: string) => crypto.createHash("sha256").update(value, "utf8").digest();

/** Constant-time comparison; both sides are hashed so length never leaks. */
export function checkReleasePasscode(candidate: string): boolean {
  const expected = process.env.PAYPAL_PAYOUT_PASSCODE?.trim();
  if (!expected || !candidate) return false;
  return crypto.timingSafeEqual(digest(candidate.trim()), digest(expected));
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
  if (!releasePasscodeConfigured()) return false;
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
  if (!releasePasscodeConfigured()) {
    return "No release passcode is set. Add PAYPAL_PAYOUT_PASSCODE to the environment to enable the release button.";
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
  mode: PayPalMode = paypalMode(),
): Promise<{ ok: true; token: string; expiresIn: number; scope: string | null } | { ok: false; status: number; message: string }> {
  const res = await fetch(`${API[mode]}/v1/oauth2/token`, {
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
          paypalMode() === "live"
            ? "Someone left instructions for this. The transfer is on its way."
            : "This transfer ran in PayPal's sandbox and is not a real payment.",
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

/* ----------------------------------------------------------------- funding */

/**
 * Money in. PayPal has no "top up" API and is not a bank, so the honest way to
 * fund a release account is a real payment: the owner pays the app's own
 * PayPal business account through an Orders v2 checkout, and the payout run
 * later spends that balance. Sandbox currency, real API calls.
 */
export interface DepositOrder {
  id: string;
  approveUrl: string;
}

export async function createDepositOrder(
  amount: string,
  currency: string,
  returnUrl: string,
  cancelUrl: string,
): Promise<DepositOrder> {
  const token = await appAccessToken();

  const res = await fetch(`${API[paypalMode()]}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description: "VIVO release account",
          amount: { currency_code: currency, value: amount },
        },
      ],
      application_context: {
        brand_name: "VIVO",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | { id?: string; links?: { rel?: string; href?: string }[]; message?: string; name?: string }
    | null;

  if (!res.ok || !json?.id) {
    const message = json?.message ?? json?.name ?? `PayPal could not open an order (${res.status})`;
    throw new PayPalError(message, res.ok ? 502 : res.status);
  }

  const approveUrl = json.links?.find((l) => l.rel === "approve" || l.rel === "payer-action")?.href;
  if (!approveUrl) throw new PayPalError("PayPal returned no approval link", 502);

  return { id: json.id, approveUrl };
}

export interface DepositCapture {
  status: string;
  amount: string | null;
  currency: string | null;
  captureId: string | null;
}

export async function captureDepositOrder(orderId: string): Promise<DepositCapture> {
  const token = await appAccessToken();

  const res = await fetch(`${API[paypalMode()]}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: "{}",
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | {
        status?: string;
        purchase_units?: {
          payments?: {
            captures?: { id?: string; amount?: { value?: string; currency_code?: string } }[];
          };
        }[];
        message?: string;
        name?: string;
      }
    | null;

  if (!res.ok) {
    const message = json?.message ?? json?.name ?? `PayPal could not capture the payment (${res.status})`;
    throw new PayPalError(message, res.status);
  }

  const capture = json?.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: json?.status ?? "UNKNOWN",
    amount: capture?.amount?.value ?? null,
    currency: capture?.amount?.currency_code ?? null,
    captureId: capture?.id ?? null,
  };
}

/* -------------------------------------------------------------------- send */

/**
 * Money out to one person. This is a payout from the app's own business
 * account — the same rail the estate release uses, with a single item and a
 * unique batch id so a retry cannot send twice.
 */
export async function sendToRecipient(
  email: string,
  amountCents: number,
  note: string,
  currency = "USD",
): Promise<{ batchId: string | null; status: string }> {
  const token = await appAccessToken();
  const batchId = `vivo-send-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

  const res = await fetch(`${API[paypalMode()]}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: batchId,
        email_subject: "A payment from VIVO",
        email_message:
          paypalMode() === "live"
            ? "A payment was sent to you from a VIVO plan."
            : "This payment ran in PayPal's sandbox and is not real money.",
      },
      items: [
        {
          recipient_type: "EMAIL",
          receiver: email,
          amount: { value: decimal(amountCents), currency },
          note: note.slice(0, 400),
          sender_item_id: batchId.slice(0, 63),
        },
      ],
    }),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | { batch_header?: { payout_batch_id?: string; batch_status?: string }; message?: string; name?: string }
    | null;

  if (!res.ok) {
    throw new PayPalError(json?.message ?? json?.name ?? `PayPal rejected the payment (${res.status})`, res.status);
  }
  return {
    batchId: json?.batch_header?.payout_batch_id ?? null,
    status: json?.batch_header?.batch_status ?? "PENDING",
  };
}

/* ----------------------------------------------------------------- receive */

/**
 * Money in, requested rather than taken: PayPal emails the payer an invoice
 * they can settle from their own account. Nothing is charged without them.
 */
export async function requestPayment(
  email: string,
  amountCents: number,
  note: string,
  currency = "USD",
): Promise<{ invoiceId: string; status: string }> {
  const token = await appAccessToken();
  const invoiceNumber = `VIVO-${Date.now().toString(36).toUpperCase()}`;

  const res = await fetch(`${API[paypalMode()]}/v2/invoicing/invoices?send_to_recipient=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      detail: {
        invoice_number: invoiceNumber,
        currency_code: currency,
        note: note.slice(0, 400) || "Requested through VIVO",
        payment_term: { term_type: "DUE_ON_RECEIPT" },
      },
      primary_recipients: [{ billing_info: { email_address: email } }],
      items: [
        {
          name: "Money for a VIVO plan",
          description: note.slice(0, 200) || "Transfer into a VIVO plan",
          quantity: "1",
          unit_amount: { currency_code: currency, value: decimal(amountCents) },
        },
      ],
    }),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | { id?: string; status?: string; message?: string; name?: string; details?: { issue?: string }[] }
    | null;

  if (!res.ok || !json?.id) {
    const reason =
      json?.message ??
      json?.details?.[0]?.issue ??
      json?.name ??
      `PayPal could not raise the request (${res.status})`;
    throw new PayPalError(reason, res.ok ? 502 : res.status);
  }

  return { invoiceId: json.id, status: json.status ?? "DRAFT" };
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

/* --------------------------------------------------------------- diagnosis */

/**
 * The one redirect URI we send and expect back.
 *
 * PayPal only accepts a URI that is registered on the app for "Log in with
 * PayPal", so this is pinned by PAYPAL_REDIRECT_URI in production and derived
 * from the request host everywhere else. The route it points at exists at
 * /api/paypal/callback (and /api/paypal/oauth/callback for older links).
 */
export function paypalRedirectUri(requestUrl: string): string {
  const configured = process.env.PAYPAL_REDIRECT_URI?.trim();
  if (configured) return configured;
  return new URL("/api/paypal/callback", requestUrl).toString();
}

export interface PayPalDiagnosis {
  mode: PayPalMode;
  api: string;
  configured: boolean;
  clientIdShape: string;
  secretShape: string;
  redirectUri: string;
  token: { ok: boolean; status: number; message: string };
  balances: { ok: boolean; status: number; message: string };
  payoutCapability: { ok: boolean; status: number; message: string };
  invoicing: { ok: boolean; status: number; message: string };
  /** Did the same credentials work against the other PayPal environment? */
  otherEnvironment: { mode: PayPalMode; ok: boolean; message: string } | null;
  verdict: string;
}

const shape = (value: string) =>
  value ? `${value.length} chars, starts ${value.slice(0, 6)}…, ends …${value.slice(-4)}` : "missing";

/**
 * Ask PayPal, rather than guessing. This is what the "Test connection" button
 * calls: it proves whether the stored client id and secret authenticate, and
 * which capabilities the app actually has.
 */
export async function diagnosePayPal(requestUrl: string): Promise<PayPalDiagnosis> {
  const mode = paypalMode();
  const id = clientId();
  const secret = clientSecret();

  const result: PayPalDiagnosis = {
    mode,
    api: API[mode],
    configured: Boolean(id && secret),
    clientIdShape: shape(id),
    secretShape: shape(secret),
    redirectUri: paypalRedirectUri(requestUrl),
    token: { ok: false, status: 0, message: "not attempted" },
    balances: { ok: false, status: 0, message: "not attempted" },
    payoutCapability: { ok: false, status: 0, message: "not attempted" },
    invoicing: { ok: false, status: 0, message: "not attempted" },
    otherEnvironment: null,
    verdict: "",
  };

  if (!id || !secret) {
    result.verdict = "No client id or secret is set, so nothing can call PayPal.";
    return result;
  }

  const tokenResult = await tokenRequest({ grant_type: "client_credentials" }).catch((error: unknown) => ({
    ok: false as const,
    status: 0,
    message: error instanceof Error ? error.message : "request failed",
  }));

  result.token = { ok: tokenResult.ok, status: tokenResult.ok ? 200 : tokenResult.status, message: tokenResult.ok ? "authenticated" : tokenResult.message };

  if (!tokenResult.ok) {
    /* The classic mistake is copying the Live pair while the app runs in
       sandbox (or the reverse). Ask the other environment directly. */
    const other: PayPalMode = mode === "sandbox" ? "live" : "sandbox";
    const probe = await tokenRequest({ grant_type: "client_credentials" }, other).catch((error: unknown) => ({
      ok: false as const,
      status: 0,
      message: error instanceof Error ? error.message : "request failed",
    }));

    result.otherEnvironment = {
      mode: other,
      ok: probe.ok,
      message: probe.ok ? "credentials accepted" : probe.message,
    };

    result.verdict = probe.ok
      ? `These credentials belong to the ${other} environment, but this deployment is set to ${mode}. ${
          other === "live"
            ? "Copy the Sandbox tab's Client ID and Secret to keep testing, or switch PAYPAL_ENV to live and go through PayPal's live review."
            : "Switch PAYPAL_ENV to sandbox, or copy the Live tab's credentials."
        }`
      : `PayPal rejected this client id and secret in both environments (${mode} and ${other}). A secret only works with the app that issued it and in the tab it was issued for, so copy the pair together, from one app, once.`;

    return result;
  }

  const token = tokenResult.token;

  const balanceRes = await fetch(`${API[mode]}/v1/reporting/balances?currency_code=USD`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  }).catch(() => null);
  const balanceBody = balanceRes
    ? ((await balanceRes.json().catch(() => null)) as
        | { balances?: { currency?: string; total_balance?: { value?: string } }[] }
        | null)
    : null;
  const primaryBalance = balanceBody?.balances?.[0];
  result.balances = balanceRes
    ? {
        ok: balanceRes.ok,
        status: balanceRes.status,
        message: balanceRes.ok
          ? primaryBalance
            ? `read · ${primaryBalance.currency ?? "USD"} ${primaryBalance.total_balance?.value ?? "0.00"}`
            : "read · no balances returned"
          : `HTTP ${balanceRes.status}`,
      }
    : { ok: false, status: 0, message: "request failed" };

  const payoutRes = await fetch(`${API[mode]}/v1/payments/payouts?page_size=1&page=1&total_required=true`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  }).catch(() => null);
  result.payoutCapability = payoutRes
    ? {
        ok: payoutRes.ok,
        status: payoutRes.status,
        message: payoutRes.ok ? "payouts reachable" : (await payoutRes.text().catch(() => "")).slice(0, 200) || `HTTP ${payoutRes.status}`,
      }
    : { ok: false, status: 0, message: "request failed" };

  const invoiceRes = await fetch(`${API[mode]}/v2/invoicing/invoices?page_size=1&total_required=false`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  }).catch(() => null);
  result.invoicing = invoiceRes
    ? {
        ok: invoiceRes.ok,
        status: invoiceRes.status,
        message: invoiceRes.ok ? "invoices reachable" : (await invoiceRes.text().catch(() => "")).slice(0, 200) || `HTTP ${invoiceRes.status}`,
      }
    : { ok: false, status: 0, message: "request failed" };

  result.verdict = result.payoutCapability.ok
    ? "Credentials work and payouts are reachable."
    : result.payoutCapability.status === 403 || result.payoutCapability.status === 404
      ? "Credentials work, but this app has no Payouts access. Payouts must be enabled on the Live app by PayPal, and the business account has to be in a country PayPal pays out from."
      : "Credentials work, but the payouts check did not succeed.";

  return result;
}

export function footerNote(): string {
  if (!paypalConfigured()) {
    return "Your plan is private. Balances are what you record; no provider is connected.";
  }
  if (paypalMode() === "live") {
    return "PayPal Live connected · A release moves real money, once the passcode is given.";
  }
  return "PayPal Sandbox connected · Transfers run against PayPal's sandbox account.";
}
