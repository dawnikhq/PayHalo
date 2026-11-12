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
    "",
    `${details.ownerName} has named you as their Trusted Key on PayHalo.`,
    "",
    "Being a Trusted Key does not give you their assets, their balances or their instructions. It lets you do one thing: if something happens to them, you can open a handover request and submit the documents it needs.",
    "",
    "Your access code is never sent by email. It is waiting inside your PayHalo portal:",
    details.portalUrl,
  ];

  if (details.signupUrl) {
    lines.push(
      "",
      "There is no PayHalo account with this address yet. Create one using this same email address, and your portal opens with the code already in it:",
      details.signupUrl,
    );
  }

  lines.push(
    "",
    "If you were not expecting this, you can ignore this message. Nothing changes unless you act.",
    ...SIGNATURE,
  );

  return send({
    to,
    toName: details.keyholderName,
    subject: `${details.ownerName} named you as their Trusted Key`,
    text: lines.join("\n"),
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
  return send({
    to,
    toName: details.name ?? undefined,
    subject: "Reset your PayHalo password",
    text: [
      greeting,
      "",
      "Someone asked to reset the password on your PayHalo account. If that was you, open this link and choose a new one:",
      "",
      details.url,
      "",
      `The link works once, and for ${details.minutes} minutes. Your current password keeps working until you set a new one.`,
      "",
      "If you did not ask for this, ignore the message — nothing changes.",
      ...SIGNATURE,
    ].join("\n"),
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
    await send({
      to: to.owner,
      toName: details.ownerName,
      subject: "A verified handover request has been filed on your plan",
      text: [
        `Hello ${details.ownerName},`,
        "",
        `The documents filed by ${details.keyholderName} as your Trusted Key have been verified. A handover request is now open on your plan.`,
        "",
        `You have ${details.days} full days to respond. If this is a mistake, or you are well, sign in and stop it here:`,
        details.ownerUrl,
        "",
        "Nothing is transferred before that window closes, and PayHalo cannot shorten it.",
        ...SIGNATURE,
      ].join("\n"),
    });
  }

  if (to.keyholder) {
    await send({
      to: to.keyholder,
      toName: details.keyholderName,
      subject: `Claim #${details.claimId}: your documents were accepted`,
      text: [
        `Hello ${details.keyholderName},`,
        "",
        `The documents you filed for ${details.ownerName} have been accepted.`,
        "",
        `${details.days} days from now, if ${details.ownerName} does not respond, the handover proceeds as recorded in their plan.`,
        "",
        "You can follow the status here:",
        details.keyholderUrl,
        ...SIGNATURE,
      ].join("\n"),
    });
  }
}

export async function sendClaimRefused(
  to: string,
  details: { keyholderName: string; ownerName: string; claimId: number; reason: string; url: string },
): Promise<MailResult> {
  return send({
    to,
    toName: details.keyholderName,
    subject: `Claim #${details.claimId}: the documents were not accepted`,
    text: [
      `Hello ${details.keyholderName},`,
      "",
      `A reviewer looked at the documents you filed for ${details.ownerName} and could not accept them.`,
      "",
      `Reason given: ${details.reason}`,
      "",
      "Nothing has changed on the plan. You can file again with a clearer record here:",
      details.url,
      ...SIGNATURE,
    ].join("\n"),
  });
}
