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

/**
 * Credentials are resolved per mode, so one deployment can hold both pairs and
 * switch with PAYPAL_ENV alone — no secret swapping, no half-migrated state.
 * A missing sandbox pair falls back to the shared variables.
 */
function credentialName(kind: "id" | "secret", mode: PayPalMode): string[] {
  const specific = kind === "id" ? "PAYPAL_SANDBOX_CLIENT_ID" : "PAYPAL_SANDBOX_CLIENT_SECRET";
  const shared = kind === "id" ? "PAYPAL_CLIENT_ID" : "PAYPAL_CLIENT_SECRET";
  return mode === "sandbox" ? [specific, shared] : [shared];
}

function readCredential(kind: "id" | "secret"): string {
  for (const name of credentialName(kind, paypalMode())) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function clientId(): string {
  return readCredential("id");
}

function clientSecret(): string {
  return readCredential("secret");
}

/** Which variable the pair came from — useful in the diagnosis, never the value. */
export function paypalCredentialSource(): { id: string; secret: string } {
  const pick = (kind: "id" | "secret") => {
    for (const name of credentialName(kind, paypalMode())) {
      if (process.env[name]?.trim()) return name;
    }
    return "unset";
  };
  return { id: pick("id"), secret: pick("secret") };
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

/**
 * The one sentence a person reads when sending is unavailable. Deliberately
 * free of environment names, status codes and provider detail: the operator
 * console has the diagnosis, the customer has a plain answer.
 */
export function payoutsBlockedReason(): string | null {
  if (!paypalConfigured() || process.env.PAYPAL_PAYOUTS_ENABLED?.toLowerCase() !== "true") {
    return "Sending is not available on this account yet. Asking for money works today.";
  }
  if (paypalMode() === "live" && process.env.PAYPAL_ALLOW_LIVE_PAYOUTS?.toLowerCase() !== "true") {
    return "Sending is not available on this account yet. Asking for money works today.";
  }
  if (!releasePasscodeConfigured()) {
    return "Sending is not available on this account yet. Asking for money works today.";
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
): Promise<
  | { ok: true; token: string; expiresIn: number; scope: string | null; idToken: string | null }
  | { ok: false; status: number; message: string }
> {
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
    | {
        access_token?: string;
        expires_in?: number;
        scope?: string;
        id_token?: string;
        error?: string;
        error_description?: string;
      }
    | null;

  if (!res.ok || !json?.access_token) {
    return {
      ok: false,
      status: res.status,
      message: json?.error_description ?? json?.error ?? `PayPal returned ${res.status}`,
    };
  }

  return {
    ok: true,
    token: json.access_token,
    expiresIn: Number(json.expires_in ?? 0),
    scope: json.scope ?? null,
    idToken: json.id_token ?? null,
  };
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
  /** Present when the `openid` scope was granted; carries the profile as claims. */
  idToken: string | null;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
  const result = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  if (!result.ok) throw new PayPalError(result.message, result.status);
  return { accessToken: result.token, expiresIn: result.expiresIn, scope: result.scope, idToken: result.idToken };
}

export interface PayPalIdentity {
  payerId: string;
  email: string;
  name: string | null;
}

type UserInfoPayload = {
  sub?: string;
  user_id?: string;
  payer_id?: string;
  email?: string;
  emails?: { value?: string; primary?: boolean }[];
  name?: string;
  given_name?: string;
  family_name?: string;
  error?: string;
  error_description?: string;
};

/** The claims inside an OpenID id_token. Nothing here is trusted for access —
 *  it only saves a second round trip to ask who signed in. */
function claimsFromIdToken(idToken: string | null | undefined): UserInfoPayload | null {
  if (!idToken) return null;
  const payload = idToken.split(".")[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Three facts, if PayPal shared them. An email is what the screen shows, but it
 * is not a condition of the link: a sandbox app that only shares the account id
 * still identifies an account, and refusing the whole sign-in over a missing
 * email is how a working connection reads as a broken one.
 */
function identityFrom(payload: UserInfoPayload): PayPalIdentity | null {
  const email = payload.email ?? payload.emails?.find((e) => e.primary)?.value ?? payload.emails?.[0]?.value ?? "";
  const payerId = payload.sub ?? payload.user_id ?? payload.payer_id ?? "";
  if (!email && !payerId) return null;
  const assembled = [payload.given_name, payload.family_name].filter(Boolean).join(" ");
  return {
    payerId: payerId || "unknown",
    email,
    name: payload.name ?? (assembled || null),
  };
}

/**
 * Who just signed in.
 *
 * PayPal answers this in more shapes than one: OpenID Connect on the
 * `openidconnect` endpoint, the older v1.1 profile on the `oauth2` endpoint,
 * and — when neither answers — the claims already inside the id_token that came
 * back with the sign-in. Asking one way and failing would throw away a sign-in
 * PayPal already granted, so every route to the same three facts is tried, and
 * the last refusal is quoted so the next attempt has a lead.
 */
export async function userInfo(accessToken: string, idToken: string | null = null): Promise<PayPalIdentity> {
  const endpoints = [
    "/v1/identity/openidconnect/userinfo?schema=openid",
    "/v1/identity/oauth2/userinfo?schema=openid",
    "/v1/identity/oauth2/userinfo?schema=paypalv1.1",
  ];

  let lastError = "";

  for (const path of endpoints) {
    try {
      const res = await fetch(`${API[paypalMode()]}${path}`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as UserInfoPayload | null;
      const identity = json && res.ok ? identityFrom(json) : null;
      if (identity) return identity;

      const said = json?.error_description ?? json?.error ?? "";
      lastError = `${path.split("?")[1] ?? path} · ${res.status}${said ? ` · ${said}` : ""}`;
    } catch {
      lastError = `${path} · unreachable`;
    }
  }

  /* Last resort: the id_token is issued to this app by PayPal itself. */
  const identity = identityFrom(claimsFromIdToken(idToken) ?? {});
  if (identity) return identity;

  throw new PayPalError(
    `PayPal signed you in but would not return the profile (${lastError || "no profile returned"}).`,
    502,
  );
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
  /** Which env vars the pair came from, so a wrong pair is visible in one line. */
  credentialSource: { id: string; secret: string };
  redirectUri: string;
  token: { ok: boolean; status: number; message: string };
  balances: { ok: boolean; status: number; message: string };
  payoutCapability: { ok: boolean; status: number; message: string };
  invoicing: { ok: boolean; status: number; message: string };
  /**
   * The other half of "connect": the API can be perfect and the login page can
   * still refuse, because "Log in with PayPal" is a feature on the app and a
   * return URL has to be registered for it. This asks that page directly.
   */
  oauth: OAuthProbe;
  /** Did the same credentials work against the other PayPal environment? */
  otherEnvironment: { mode: PayPalMode; ok: boolean; message: string } | null;
  verdict: string;
}

const shape = (value: string) =>
  value ? `${value.length} chars, starts ${value.slice(0, 6)}…, ends …${value.slice(-4)}` : "missing";

export interface OAuthProbe {
  scope: string;
  host: string;
  status: number;
  finalHost: string;
  title: string | null;
  hint: string;
  /**
   * The profile endpoints, asked without a token. A 401 means "the address is
   * right, bring a user token"; a 404 means "there is nothing at this address".
   * That difference is what tells a wrong URL apart from a missing permission.
   */
  profileEndpoints: { path: string; status: number }[];
}

const PHRASES: [RegExp, string][] = [
  [/invalid[_ ]client/i, "PayPal says this client id is unknown in this environment. Copy the Sandbox client id from the app you actually made."],
  [/redirect[_ ]uri/i, "The return URL is not registered on the app. Register this exact address under Log in with PayPal → Return URL."],
  [/invalid[_ ]scope/i, "The app is not allowed to ask for openid/profile/email. Enable Log in with PayPal on the app, with the Email scope."],
  [/log ?in with paypal/i, "The page is the Log in with PayPal sign-in form, which means the app and the return URL were accepted."],
  [/sorry|couldn.?t complete|unable to (process|complete)/i, "PayPal showed its generic failure page. That is usually Log in with PayPal not being enabled on the app, or a return URL that does not match."],
];

/**
 * Fetch the page the Connect button would land on, and read its title.
 *
 * Nothing is submitted: this is a GET of PayPal's sign-in page, the same one a
 * browser would open. It answers the only question the API probe cannot — does
 * this app have "Log in with PayPal" switched on for this environment?
 */
async function probeConnect(redirectUri: string): Promise<OAuthProbe> {
  const probe: OAuthProbe = {
    scope: OAUTH_SCOPE,
    host: new URL(WEB[paypalMode()]).host,
    status: 0,
    finalHost: "",
    title: null,
    hint: "not attempted",
    profileEndpoints: [],
  };

  const paths = [
    "/v1/identity/openidconnect/userinfo?schema=openid",
    "/v1/identity/oauth2/userinfo?schema=openid",
    "/v1/identity/oauth2/userinfo?schema=paypalv1.1",
  ];
  probe.profileEndpoints = await Promise.all(
    paths.map(async (path) => {
      try {
        const res = await fetch(`${API[paypalMode()]}${path}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        return { path: path.split("/v1/identity/")[1] ?? path, status: res.status };
      } catch {
        return { path: path.split("/v1/identity/")[1] ?? path, status: 0 };
      }
    }),
  );

  try {
    const res = await fetch(authorizeUrl(redirectUri, "diagnostic"), {
      headers: { Accept: "text/html", "User-Agent": "PayHalo/1.0 (+diagnostics)" },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });

    const html = (await res.text().catch(() => "")).slice(0, 200_000);
    probe.status = res.status;
    try {
      probe.finalHost = new URL(res.url).host;
    } catch {
      probe.finalHost = probe.host;
    }

    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.replace(/\s+/g, " ").trim();
    probe.title = title ? title.slice(0, 120) : null;

    const text = `${title ?? ""} ${html.replace(/<[^>]+>/g, " ")}`.replace(/\s+/g, " ");
    const match = PHRASES.find(([pattern]) => pattern.test(text));
    probe.hint = match
      ? match[1]
      : res.ok
        ? "PayPal answered normally. If the button still fails, the login page refused the account: use a sandbox Personal test account, not a real PayPal login."
        : `PayPal answered ${res.status} for this app, so the connect page itself is unhappy.`;
  } catch (error) {
    probe.hint =
      error instanceof Error && error.name === "TimeoutError"
        ? "The connect page did not answer in time."
        : "The connect page could not be reached from this deployment.";
  }

  return probe;
}

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
    credentialSource: paypalCredentialSource(),
    redirectUri: paypalRedirectUri(requestUrl),
    token: { ok: false, status: 0, message: "not attempted" },
    balances: { ok: false, status: 0, message: "not attempted" },
    payoutCapability: { ok: false, status: 0, message: "not attempted" },
    invoicing: { ok: false, status: 0, message: "not attempted" },
    oauth: {
      scope: OAUTH_SCOPE,
      host: "",
      status: 0,
      finalHost: "",
      title: null,
      hint: "not attempted",
      profileEndpoints: [],
    },
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

  /* Payouts has no read endpoint — a GET always 404s, enabled or not. The honest
     probe is a POST with an empty body: an app without the capability is refused
     (401/403) before the body is even read, an app with it complains about the
     body (400/422) and nothing is sent. */
  const payoutRes = await fetch(`${API[mode]}/v1/payments/payouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({}),
    cache: "no-store",
  }).catch(() => null);
  const payoutDenied = payoutRes ? [401, 403].includes(payoutRes.status) : false;
  result.payoutCapability = payoutRes
    ? {
        ok: !payoutDenied,
        status: payoutRes.status,
        message: payoutDenied
          ? (await payoutRes.text().catch(() => "")).slice(0, 200) || `HTTP ${payoutRes.status}`
          : `reachable · PayPal answered ${payoutRes.status} to an empty payout (expected)`,
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

  /* The same return URL a real Connect would send, so PayPal judges it the
     same way it would judge the button. */
  result.oauth = await probeConnect(result.redirectUri);

  result.verdict = result.payoutCapability.ok
    ? "Credentials work and payouts are reachable — sending is live."
    : result.payoutCapability.status === 401 || result.payoutCapability.status === 403
      ? mode === "sandbox"
        ? "Credentials work and balances and invoices are readable, but this app is refused payouts. Turn Payouts on in Apps & Credentials → your app → Features → Payouts; sandbox transfers are free."
        : "Credentials work, but this app has no Payouts access. Payouts must be enabled on the Live app by PayPal, and the business account has to be in a country PayPal pays out from."
      : "Credentials work, but the payouts check did not succeed.";

  return result;
}
