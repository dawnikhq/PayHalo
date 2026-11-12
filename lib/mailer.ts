/**
 * Transactional email, through Brevo. One POST, no SDK.
 *
 * PayHalo sends two messages and nothing else: a sign-in link, and the vault key
 * to the first beneficiary when a plan is finished. If Brevo is not configured
 * the caller is told, and the screen offers to show the key once instead — the
 * app never pretends an email went out.
 */

export interface MailResult {
  sent: boolean;
  reason?: string;
}

const apiKey = () => (process.env.BREVO_API_KEY ?? "").trim();

/**
 * The sender. `MAIL_FROM` when it is set, otherwise the address this Brevo
 * account is actually verified for.
 *
 * Vercel scopes an environment variable to specific targets, and this project
 * once set MAIL_FROM for production only — which meant every preview deployment
 * (the branch aliases, where this product actually gets tested) believed email
 * was unavailable and refused to send anything. A sender we can always name is
 * better than a sender that disappears with a deployment target.
 *
 * Whatever this says is still only a default: `authorisedSender()` below asks
 * Brevo which addresses it will accept, and sends from one of those.
 */
const DEFAULT_SENDER = "admin.payhalo@gmail.com";

const fromEmail = () =>
  (process.env.MAIL_FROM ?? process.env.MAIL_FROM_EMAIL ?? process.env.BREVO_SENDER_EMAIL ?? "").trim() ||
  DEFAULT_SENDER;

const fromName = () => (process.env.MAIL_FROM_NAME ?? "").trim() || "PayHalo";

/** Every message signs off the same way. */
const SIGNATURE = ["", "PayHalo", "Your Wealth, left in good hands."];

/** True when there is a key to send with. The sender always resolves. */
export function mailConfigured(): boolean {
  return Boolean(apiKey());
}

/** What the delivery report shows. No secrets, only yes/no and the sender. */
export interface MailHealth {
  keyPresent: boolean;
  sender: string;
  senderSource: "environment" | "default";
  senderName: string;
  provider: string;
}

export async function mailHealthAsync(): Promise<MailHealth & { effectiveSender: string }> {
  const effectiveSender = await authorisedSender();
  return { ...mailHealth(), effectiveSender };
}

export function mailHealth(): MailHealth {
  const fromEnv = (process.env.MAIL_FROM ?? process.env.MAIL_FROM_EMAIL ?? process.env.BREVO_SENDER_EMAIL ?? "").trim();
  return {
    keyPresent: Boolean(apiKey()),
    sender: fromEmail(),
    senderSource: fromEnv ? "environment" : "default",
    senderName: fromName(),
    provider: "Brevo",
  };
}

/** Ask Brevo who the key belongs to. Proves reachability without sending mail. */
export async function brevoAccount(): Promise<{ ok: boolean; detail: string }> {
  if (!apiKey()) return { ok: false, detail: "No BREVO_API_KEY on this deployment." };
  try {
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": apiKey(), Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, detail: `Brevo refused the key (${res.status}).` };
    const body = (await res.json().catch(() => ({}))) as { email?: string; companyName?: string };
    return { ok: true, detail: `Key valid for ${body.email ?? "an account"}${body.companyName ? ` (${body.companyName})` : ""}.` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "Brevo is unreachable." };
  }
}

interface Message {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html?: string;
}

/* ------------------------------------------------------------------ design -- */

/**
 * One email shell, used by every message PayHalo sends.
 *
 * Email clients are not browsers: no flexbox, no external CSS, no web fonts, no
 * background images worth relying on. So this is tables and inline styles, and
 * the "banner" is built from solid cells rather than a picture — a deep green
 * band, a mint rule, the wordmark and the line that says what the product is
 * for. It degrades to a plain, readable document in every client that ignores
 * the styling, which is the point.
 */
export interface EmailParts {
  /** The line the inbox shows next to the subject. */
  preheader?: string;
  eyebrow?: string;
  heading: string;
  /** Paragraphs. Plain text; blank strings become spacing. */
  lines?: string[];
  /** Small label/value rows, for references, amounts and dates. */
  facts?: { label: string; value: string }[];
  action?: { label: string; url: string };
  secondary?: { label: string; url: string };
  note?: string;
  /** Tiny print at the very bottom, above the address line. */
  finePrint?: string;
}

const GREEN = "#0B3D2E";
const BRAND = "#0E6F56";
const MINT = "#A7F3D0";
const LIGHT = "#E8F8F2";
const INK = "#0A0F0D";
const MUTED = "#6B7280";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Turns a URL in a paragraph into a link, without touching the rest. */
function linkify(text: string): string {
  return escapeHtml(text).replace(
    /(https?:\/\/[^\s<]+)/g,
    `<a href="$1" style="color:${BRAND};text-decoration:underline;">$1</a>`,
  );
}

export function renderEmail(parts: EmailParts): string {
  const facts = (parts.facts ?? []).length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0 4px;border:1px solid #e2ebe5;border-radius:12px;border-collapse:separate;">
        ${(parts.facts ?? [])
          .map(
            (f, i) => `<tr>
              <td style="padding:11px 16px;font:600 11px/1.3 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${MUTED};${i ? "border-top:1px solid #edf3ef;" : ""}">${escapeHtml(f.label)}</td>
              <td align="right" style="padding:11px 16px;font:600 14px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};${i ? "border-top:1px solid #edf3ef;" : ""}">${escapeHtml(f.value)}</td>
            </tr>`,
          )
          .join("")}
      </table>`
    : "";

  const action = parts.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px;">
        <tr><td align="center" bgcolor="${BRAND}" style="border-radius:10px;">
          <a href="${escapeHtml(parts.action.url)}" style="display:inline-block;padding:14px 26px;font:600 14px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(parts.action.label)}</a>
        </td></tr>
      </table>`
    : "";

  const secondary = parts.secondary
    ? `<p style="margin:14px 0 0;font:14px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <a href="${escapeHtml(parts.secondary.url)}" style="color:${BRAND};text-decoration:underline;">${escapeHtml(parts.secondary.label)}</a>
      </p>`
    : "";

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(parts.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f2f6f3;">
${parts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(parts.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f6f3;padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 44px -30px rgba(11,61,46,.55);">

      <!-- banner -->
      <tr>
        <td style="background:${GREEN};padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="height:5px;background:${MINT};font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:26px 30px 10px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="width:34px;height:34px;border-radius:17px;background:${MINT};font:700 15px/34px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${GREEN};text-align:center;">P</td>
                  <td style="padding-left:12px;font:700 20px/1.2 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#ffffff;letter-spacing:-.01em;">PayHalo</td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 24px;font:400 12.5px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#a9c9b8;letter-spacing:.02em;">
                Your Wealth, left in good hands.
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- body -->
      <tr>
        <td style="padding:30px 30px 8px;">
          ${parts.eyebrow ? `<p style="margin:0 0 8px;font:600 11px/1.3 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:${BRAND};">${escapeHtml(parts.eyebrow)}</p>` : ""}
          <h1 style="margin:0 0 16px;font:600 24px/1.25 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};letter-spacing:-.02em;">${escapeHtml(parts.heading)}</h1>
          ${(parts.lines ?? [])
            .map((line) =>
              line.trim()
                ? `<p style="margin:0 0 14px;font:400 15px/1.65 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#3a4a42;">${linkify(line)}</p>`
                : `<div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>`,
            )
            .join("")}
          ${facts}
          ${action}
          ${secondary}
          ${parts.note ? `<p style="margin:16px 0 0;font:400 12.5px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${MUTED};">${linkify(parts.note)}</p>` : ""}
          <div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>
        </td>
      </tr>

      <!-- sign-off -->
      <tr>
        <td style="padding:0 30px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e6efe9;">
            <tr><td style="padding-top:18px;font:400 13px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#54645c;">
              PayHalo · digital inheritance, recorded properly.<br>
              <span style="color:${MUTED};">Your Wealth, left in good hands.</span>
            </td></tr>
          </table>
        </td>
      </tr>

      <!-- footer -->
      <tr>
        <td style="background:${LIGHT};padding:18px 30px;">
          <p style="margin:0;font:400 11.5px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#5b6f64;">
            ${escapeHtml(
              parts.finePrint ??
                "You received this because someone used your address on PayHalo. If it was not you, ignore it and nothing changes.",
            )}
          </p>
          <p style="margin:8px 0 0;font:400 11px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#84968f;">
            PayHalo never asks for a password, a private key or a recovery phrase.
          </p>
        </td>
      </tr>

    </table>
    <p style="margin:14px 0 0;font:400 11px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#93a29a;">
      PayHalo · your wealth, left in good hands.
    </p>
  </td></tr>
</table>
</body></html>`;
}

/** Plain-text fallback built from the same parts, so both stay in step. */
function textFrom(parts: EmailParts): string {
  const blocks: string[] = [];
  if (parts.heading) blocks.push(parts.heading.toUpperCase());
  for (const line of parts.lines ?? []) blocks.push(line);
  for (const fact of parts.facts ?? []) blocks.push(`${fact.label}: ${fact.value}`);
  if (parts.action) blocks.push(`${parts.action.label}: ${parts.action.url}`);
  if (parts.secondary) blocks.push(`${parts.secondary.label}: ${parts.secondary.url}`);
  if (parts.note) blocks.push(parts.note);
  blocks.push("", "PayHalo", "Your Wealth, left in good hands.");
  return blocks.join("\n");
}

/**
 * Brevo only accepts a sender it has validated, and it rejects the rest *after*
 * answering the API call — which is how a sign-in code can be "sent" and never
 * arrive. So before sending, ask Brevo which senders are real and use one of
 * those if the configured address is not among them.
 */
let senderCache: { at: number; address: string | null } | null = null;

export async function authorisedSender(): Promise<string> {
  const configured = fromEmail();
  if (!apiKey()) {
    senderCache = { at: Date.now(), address: null };
    return configured;
  }
  if (senderCache && Date.now() - senderCache.at < 60_000) {
    return senderCache.address ?? configured;
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/senders?ip=0", {
      headers: { "api-key": apiKey(), Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      senderCache = { at: Date.now(), address: null };
      return configured;
    }
    const body = (await res.json()) as { senders?: { email?: string; active?: boolean }[] };
    const list = (body.senders ?? []).filter((s) => s.email && s.active !== false);
    const lower = configured.toLowerCase();
    const chosen = list.find((s) => (s.email ?? "").toLowerCase() === lower)?.email ?? list[0]?.email ?? null;
    senderCache = { at: Date.now(), address: chosen };
    return chosen ?? configured;
  } catch {
    senderCache = { at: Date.now(), address: null };
    return configured;
  }
}

async function deliver(message: Message): Promise<MailResult> {
  if (!mailConfigured()) {
    return { sent: false, reason: "Email delivery is not set up on this account yet." };
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: fromName(), email: await authorisedSender() },
      to: [{ email: message.to, ...(message.toName ? { name: message.toName } : {}) }],
      subject: message.subject,
      textContent: message.text,
      htmlContent: message.html ?? renderEmail({ heading: message.subject, lines: message.text.split("\n") }),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { sent: false, reason: `The email service refused the message (${res.status}) ${detail.slice(0, 120)}`.trim() };
  }
  return { sent: true };
}

/** Send one designed message. Text and HTML always describe the same thing. */
async function sendEmail(
  to: string,
  toName: string | undefined,
  subject: string,
  parts: EmailParts,
): Promise<MailResult> {
  return deliver({
    to,
    toName,
    subject,
    text: textFrom(parts),
    html: renderEmail(parts),
  });
}

/**
 * The vault key. The one message a beneficiary ever gets unprompted: the plan is
 * finished, and this is the key that proves they are the person named.
 */
/**
 * The vault key. The one message a beneficiary ever gets unprompted: the plan is
 * finished, and this is the key that proves they are the person named.
 */
export async function sendVaultKey(
  to: string,
  details: { ownerName: string; toName?: string; vaultRef: string; key: string; url: string },
): Promise<MailResult> {
  if (!to.trim()) return { sent: false, reason: "There is no email address for this person yet." };

  return sendEmail(to, details.toName, `${details.ownerName} named you, and this is your key`, {
    preheader: `${details.ownerName} has finished their plan on PayHalo and named you first.`,
    eyebrow: "A plan is finished",
    heading: `${details.ownerName} named you, and this is your key`,
    lines: [
      `${details.ownerName} has finished a PayHalo plan and named you first. That is a decision they made deliberately, and it is recorded.`,
      "Keep this key somewhere safe. If anything happens to them, you use it to ask for the plan to be opened — nothing moves without it.",
    ],
    facts: [
      { label: "Reference", value: details.vaultRef },
      { label: "Your key", value: details.key },
      { label: "Named by", value: details.ownerName },
    ],
    action: { label: "Open your handover page", url: details.url },
    note: `No one at PayHalo can see this key, and the plan cannot be opened without it.`,
  });
}

export async function sendSignInLink(to: string, url: string): Promise<MailResult> {
  return sendEmail(to, undefined, "Your PayHalo sign-in link", {
    preheader: "One link, one use, twenty minutes.",
    eyebrow: "Sign in",
    heading: "Here is your sign-in link",
    lines: [
      "Open the button below to sign in to PayHalo. The link works once, and for twenty minutes.",
      "If you did not ask for this, ignore the message — nothing changes.",
    ],
    action: { label: "Sign in to PayHalo", url },
  });
}

/**
 * Create the account: the link is the key. Nothing exists for the person until
 * they open it, so a typo in an address cannot leave a half-made account behind.
 */
export async function sendConfirmAddress(to: string, details: { name: string; url: string; hours: number }): Promise<MailResult> {
  return sendEmail(to, details.name, "Confirm your email and open your PayHalo account", {
    preheader: "One step left before your account exists.",
    eyebrow: "One step left",
    heading: `Welcome, ${details.name}`,
    lines: [
      "Open the button below to confirm this is your email address and create your PayHalo account. Until you do, no account exists — that is deliberate.",
      `The link works once, and for ${details.hours} hours.`,
      "If you did not ask to join PayHalo, ignore this message — no account is made without the link.",
    ],
    action: { label: "Confirm and open my account", url: details.url },
  });
}

/**
 * The second factor at sign-in. Six digits, ten minutes, one use. It goes to the
 * address on the account, so a stolen password on its own opens nothing.
 */
export async function sendLoginCode(
  to: string,
  details: { name: string; code: string; minutes: number; when: string },
): Promise<MailResult> {
  return sendEmail(to, details.name, `${details.code} is your PayHalo sign-in code`, {
    preheader: `Your code expires in ${details.minutes} minutes.`,
    eyebrow: "Sign-in code",
    heading: "Your code is inside",
    lines: [
      `Enter this code to finish signing in. It works once, and for ${details.minutes} minutes.`,
      `Someone asked to sign in at ${details.when}.`,
      "If that was not you, do not use the code — change your password and tell us straight away.",
    ],
    facts: [
      { label: "Code", value: details.code },
      { label: "Expires", value: `${details.minutes} minutes` },
    ],
    finePrint: "You received this because someone signed in to PayHalo with your address. If it was not you, tell us.",
  });
}

/** A quiet note that the sign-in happened, once it has. */
export async function sendLoginNotice(
  to: string,
  details: { name: string; when: string; place: string },
): Promise<MailResult> {
  return sendEmail(to, details.name, "You signed in to PayHalo", {
    preheader: `Signed in at ${details.when}.`,
    eyebrow: "Account activity",
    heading: "You signed in",
    lines: [
      `Your PayHalo account was signed in to at ${details.when} (${details.place}).`,
      "If that was you, there is nothing to do. If it was not, change your password now and reply to this message.",
    ],
    facts: [
      { label: "When", value: details.when },
      { label: "Where", value: details.place },
    ],
  });
}

/**
 * A single test message, used only by the delivery report. It goes through the
 * same path as every real message — same sender resolution, same provider — so a
 * "delivered" event on it means the product's mail works, not that a probe does.
 */
export async function sendTestMessage(to: string): Promise<MailResult & { sender?: string }> {
  const sender = await authorisedSender();
  const result = await sendEmail(to, undefined, "PayHalo delivery test", {
    preheader: "This is only a test, but it went through the real path.",
    eyebrow: "Delivery test",
    heading: "The post is working",
    lines: [
      "This is a delivery test from PayHalo. It travelled the same route as a sign-in code or a confirmation link, so if you are reading it, those will reach this inbox too.",
    ],
    facts: [
      { label: "Sender", value: sender },
      { label: "Sent", value: new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC" },
    ],
    finePrint: "You received this because someone ran a delivery test to this address.",
  });
  return { ...result, sender };
}

/**
 * The Trusted Key introduction.
 *
 * Sent when a plan is sealed. It deliberately carries no access code: the code
 * is the thing that starts a handover, so it lives behind a sign-in, never in an
 * inbox that may be forwarded or archived. A person who is not on PayHalo yet
 * gets a sign-up link that pre-fills their address, so the code is waiting for
 * them the moment the account exists.
 */
export async function sendKeyholderNamed(
  to: string,
  details: {
    keyholderName: string;
    ownerName: string;
    portalUrl: string;
    signupUrl?: string;
  },
): Promise<MailResult> {
  if (!to.trim()) return { sent: false, reason: "There is no email address for the Trusted Key yet." };

  const greeting = details.keyholderName?.trim() ? `Hello ${details.keyholderName.trim()},` : "Hello,";
  const lines = [
    greeting,
    `${details.ownerName} has named you as their Trusted Key on PayHalo.`,
    "Being a Trusted Key does not give you their assets, their balances or their instructions. It lets you do one thing: if something happens to them, you can open a handover request and submit the documents it needs.",
    "Your access code is never sent by email. It is waiting inside your PayHalo portal.",
  ];

  if (details.signupUrl) {
    lines.push(
      "There is no PayHalo account with this address yet. Create one using this same email address, and your portal opens with the code already in it.",
    );
  }

  return sendEmail(to, details.keyholderName, `${details.ownerName} named you as their Trusted Key`, {
    preheader: `${details.ownerName} has asked you to be their Trusted Key. No action is needed today.`,
    eyebrow: "A Trusted Key",
    heading: "You have been named",
    lines,
    facts: [
      { label: "Named by", value: details.ownerName },
      { label: "Your role", value: "Trusted Key" },
      { label: "Access code", value: "Inside your portal" },
    ],
    action: { label: "Open my PayHalo portal", url: details.signupUrl ?? details.portalUrl },
    secondary: details.signupUrl ? { label: "Already have an account? Sign in", url: details.portalUrl } : undefined,
    note: "If you were not expecting this, you can ignore this message. Nothing changes unless you act.",
    finePrint: `${details.ownerName} entered your email address on PayHalo and named you as their Trusted Key.`,
  });
}

/**
 * Reset a forgotten password. One link, one hour, one use — and the response to
 * the request is identical whether or not the address has an account.
 */
export async function sendPasswordReset(
  to: string,
  details: { name?: string | null; url: string; minutes: number },
): Promise<MailResult> {
  const greeting = details.name?.trim() ? `Hello ${details.name.trim()},` : "Hello,";
  return sendEmail(to, details.name ?? undefined, "Reset your PayHalo password", {
    preheader: "One link, one use, and your current password still works until you use it.",
    eyebrow: "Password reset",
    heading: "Choose a new password",
    lines: [
      greeting,
      "Someone asked to reset the password on your PayHalo account. If that was you, open the button and choose a new one.",
      `The link works once, and for ${details.minutes} minutes. Your current password keeps working until you set a new one.`,
      "If you did not ask for this, ignore the message — nothing changes.",
    ],
    action: { label: "Set a new password", url: details.url },
    finePrint: "You received this because someone asked to reset the password for this address.",
  });
}

/**
 * The two decisions, told to the people they concern.
 *
 * Accepting is not a private event: the owner is told, in plain words, that a
 * verified handover has begun and that they can still stop it. Refusing is told
 * to the Trusted Key, with the reason, because otherwise the portal is the only
 * place a person would ever find out.
 */
export async function sendClaimAccepted(
  to: { keyholder?: string; owner?: string },
  details: { ownerName: string; keyholderName: string; claimId: number; days: number; ownerUrl: string; keyholderUrl: string },
): Promise<void> {
  if (to.owner) {
    await sendEmail(to.owner, details.ownerName, "A verified handover request has been filed on your plan", {
      preheader: `You have ${details.days} full days to respond.`,
      eyebrow: `Claim #${details.claimId}`,
      heading: "A handover request is open on your plan",
      lines: [
        `Hello ${details.ownerName},`,
        `The documents filed by ${details.keyholderName} as your Trusted Key have been verified. A handover request is now open on your plan.`,
        `You have ${details.days} full days to respond. If this is a mistake, or you are well, sign in and stop it.`,
        "Nothing is transferred before that window closes, and PayHalo cannot shorten it.",
      ],
      facts: [
        { label: "Filed by", value: details.keyholderName },
        { label: "Response window", value: `${details.days} days` },
        { label: "Claim", value: `#${details.claimId}` },
      ],
      action: { label: "Review and stop this request", url: details.ownerUrl },
      finePrint: "You received this because you are the owner of the plan this claim concerns.",
    });
  }

  if (to.keyholder) {
    await sendEmail(to.keyholder, details.keyholderName, `Claim #${details.claimId}: your documents were accepted`, {
      preheader: `The ${details.days}-day response window has begun.`,
      eyebrow: `Claim #${details.claimId}`,
      heading: "Your documents were accepted",
      lines: [
        `Hello ${details.keyholderName},`,
        `The documents you filed for ${details.ownerName} have been accepted.`,
        `${details.days} days from now, if ${details.ownerName} does not respond, the handover proceeds as recorded in their plan.`,
      ],
      facts: [
        { label: "Claim", value: `#${details.claimId}` },
        { label: "Owner", value: details.ownerName },
        { label: "Window", value: `${details.days} days` },
      ],
      action: { label: "Follow the status", url: details.keyholderUrl },
      finePrint: "You received this because you filed a handover request as a Trusted Key.",
    });
  }
}

export async function sendClaimRefused(
  to: string,
  details: { keyholderName: string; ownerName: string; claimId: number; reason: string; url: string },
): Promise<MailResult> {
  return sendEmail(to, details.keyholderName, `Claim #${details.claimId}: the documents were not accepted`, {
    preheader: "Nothing has changed on the plan.",
    eyebrow: `Claim #${details.claimId}`,
    heading: "The documents were not accepted",
    lines: [
      `Hello ${details.keyholderName},`,
      `A reviewer looked at the documents you filed for ${details.ownerName} and could not accept them.`,
      `Reason given: ${details.reason}`,
      "Nothing has changed on the plan. You can file again with a clearer record.",
    ],
    facts: [
      { label: "Claim", value: `#${details.claimId}` },
      { label: "Owner", value: details.ownerName },
      { label: "Status", value: "Not accepted" },
    ],
    action: { label: "File again", url: details.url },
    finePrint: "You received this because you filed a handover request as a Trusted Key.",
  });
}

/**
 * The receipt for a support request.
 *
 * It repeats the reference, the topic and what the person wrote, because the
 * first thing anyone asks when they chase a request is "did it go through, and
 * what did I say?" — and their own words are the clearest answer.
 */
export async function sendSupportReceipt(
  to: string,
  details: { name?: string; reference: string; topic: string; message: string },
): Promise<MailResult> {
  const firstLine = details.message.split("\n")[0].slice(0, 160);
  return sendEmail(to, details.name, `We have your request — ${details.reference}`, {
    preheader: `Reference ${details.reference}. A person will read this and reply to this address.`,
    eyebrow: "Support request received",
    heading: "It reached us",
    lines: [
      details.name ? `Hello ${details.name},` : "Hello,",
      "Your request is recorded and a person will read it. We reply to this email address, so there is nothing else to do for now.",
      "If you think of anything else, reply to this message and quote the reference above — it joins the same request.",
    ],
    facts: [
      { label: "Reference", value: details.reference },
      { label: "Topic", value: details.topic },
      { label: "First line", value: firstLine || "—" },
    ],
    finePrint: "You received this because a support request was raised with this address on PayHalo.",
  });
}

/** The operator's answer, sent as a reply in someone's own thread. */
export async function sendSupportReply(
  to: string,
  details: { name?: string; reference: string; topic: string; reply: string },
): Promise<MailResult> {
  return sendEmail(to, details.name, `Your PayHalo request — ${details.reference}`, {
    preheader: details.reply.slice(0, 120),
    eyebrow: `Reference ${details.reference}`,
    heading: "A person has answered",
    lines: [details.name ? `Hello ${details.name},` : "Hello,", details.reply],
    facts: [
      { label: "Reference", value: details.reference },
      { label: "Topic", value: details.topic },
      { label: "Status", value: "Answered" },
    ],
    note: "Reply to this message if it is still not settled — it reopens the same request.",
    finePrint: "You received this because you raised a support request with this address on PayHalo.",
  });
}
