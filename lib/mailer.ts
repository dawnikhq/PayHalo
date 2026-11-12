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
 * The sender. `MAIL_FROM` when it is set, otherwise the address Brevo has been
 * verified for PayHalo.
 *
 * Vercel scopes an environment variable to specific targets, and this project
 * sets MAIL_FROM for production only — which meant every preview deployment
 * (the branch aliases, where this product actually gets tested) believed email
 * was unavailable and refused to send anything. A sender we can always name is
 * better than a sender that disappears with a deployment target.
 */
const VERIFIED_SENDER = "hello@dawnik.com";

const fromEmail = () =>
  (process.env.MAIL_FROM ?? process.env.MAIL_FROM_EMAIL ?? process.env.BREVO_SENDER_EMAIL ?? "").trim() ||
  VERIFIED_SENDER;

const fromName = () => (process.env.MAIL_FROM_NAME ?? "").trim() || "PayHalo";

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

async function send(message: Message): Promise<MailResult> {
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
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { sent: false, reason: `The email service refused the message (${res.status}) ${detail.slice(0, 120)}`.trim() };
  }
  return { sent: true };
}

/**
 * The vault key. The one message a beneficiary ever gets unprompted: the plan is
 * finished, and this is the key that proves they are the person named.
 */
export async function sendVaultKey(
  to: string,
  details: { ownerName: string; toName?: string; vaultRef: string; key: string; url: string },
): Promise<MailResult> {
  if (!to.trim()) return { sent: false, reason: "There is no email address for this person yet." };

  return send({
    to,
    toName: details.toName,
    subject: `${details.ownerName} named you, and this is your key`,
    text: [
      `${details.ownerName} has finished a PayHalo plan and named you first.`,
      "",
      `Reference: ${details.vaultRef}`,
      `Your key: ${details.key}`,
      "",
      `Keep this key somewhere safe. If anything happens to ${details.ownerName}, you use it to ask for the plan to be opened:`,
      details.url,
      "",
      "No one at PayHalo can see this key, and the plan cannot be opened without it.",
      "",
      "PayHalo",
    ].join("\n"),
  });
}

export async function sendSignInLink(to: string, url: string): Promise<MailResult> {
  return send({
    to,
    subject: "Your PayHalo sign-in link",
    text: [
      "Here is your sign-in link. It works once, and for 20 minutes.",
      "",
      url,
      "",
      "If you did not ask for this, ignore the message — nothing changes.",
      "",
      "PayHalo",
    ].join("\n"),
  });
}

/**
 * Create the account: the link is the key. Nothing exists for the person until
 * they open it, so a typo in an address cannot leave a half-made account behind.
 */
export async function sendConfirmAddress(to: string, details: { name: string; url: string; hours: number }): Promise<MailResult> {
  return send({
    to,
    toName: details.name,
    subject: "Confirm your email and open your PayHalo account",
    text: [
      `Hello ${details.name},`,
      "",
      "One step left. Open this link to confirm this is your email address and create your PayHalo account:",
      "",
      details.url,
      "",
      `The link works once, and for ${details.hours} hours.`,
      "",
      "If you did not ask to join PayHalo, ignore this message — no account is made without the link.",
      "",
      "PayHalo",
    ].join("\n"),
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
  return send({
    to,
    toName: details.name,
    subject: `${details.code} is your PayHalo sign-in code`,
    text: [
      `Hello ${details.name},`,
      "",
      `Your sign-in code is ${details.code}.`,
      "",
      `It works once, and for ${details.minutes} minutes. Someone asked to sign in at ${details.when}.`,
      "",
      "If that was not you, do not use the code — change your password and tell us straight away.",
      "",
      "PayHalo",
    ].join("\n"),
  });
}

/** A quiet note that the sign-in happened, once it has. */
export async function sendLoginNotice(
  to: string,
  details: { name: string; when: string; place: string },
): Promise<MailResult> {
  return send({
    to,
    toName: details.name,
    subject: "You signed in to PayHalo",
    text: [
      `Hello ${details.name},`,
      "",
      `Your account was signed in to at ${details.when} (${details.place}).`,
      "",
      "If that was you, nothing to do. If it was not, change your password now and reply to this message.",
      "",
      "PayHalo",
    ].join("\n"),
  });
}

/**
 * A single test message, used only by the delivery report. It goes through the
 * same path as every real message — same sender resolution, same provider — so a
 * "delivered" event on it means the product's mail works, not that a probe does.
 */
export async function sendTestMessage(to: string): Promise<MailResult & { sender?: string }> {
  const sender = await authorisedSender();
  const result = await send({
    to,
    subject: "PayHalo delivery test",
    text: [
      "This is a delivery test from PayHalo.",
      "",
      `It was sent at ${new Date().toISOString()} from ${sender}.`,
      "If you are reading it, sign-in codes and confirmation links will reach this inbox too.",
      "",
      "PayHalo",
    ].join("\n"),
  });
  return { ...result, sender };
}
