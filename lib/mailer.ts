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
const fromEmail = () => (process.env.MAIL_FROM ?? "").trim();
const fromName = () => (process.env.MAIL_FROM_NAME ?? "PayHalo").trim();

export function mailConfigured(): boolean {
  return Boolean(apiKey() && fromEmail());
}

interface Message {
  to: string;
  toName?: string;
  subject: string;
  text: string;
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
      sender: { name: fromName(), email: fromEmail() },
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
