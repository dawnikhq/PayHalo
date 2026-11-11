/**
 * Transactional email, one provider, no dependency.
 *
 * VIVO needs exactly one message: a sign-in link. Resend's HTTP API is a
 * single POST, so it is cheaper to call it directly than to add an SDK. If no
 * provider is configured the caller is told so — the app never pretends an
 * email was sent.
 */
export interface MailResult {
  sent: boolean;
  reason?: string;
}

export function mailConfigured(): boolean {
  return Boolean((process.env.RESEND_API_KEY ?? "").trim() && (process.env.MAIL_FROM ?? "").trim());
}

/**
 * The vault key. This is the one message a beneficiary ever gets unprompted:
 * the plan started, and here is the key that proves you are the person named.
 */
export async function sendVaultKey(
  to: string,
  details: { ownerName: string; vaultRef: string; key: string; url: string },
): Promise<MailResult> {
  if (!mailConfigured()) {
    return { sent: false, reason: "Email delivery is not configured on this deployment." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${(process.env.RESEND_API_KEY ?? "").trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: (process.env.MAIL_FROM ?? "").trim(),
      to: [to],
      subject: `${details.ownerName} named you, and this is your key`,
      text: [
        `${details.ownerName} has started a PayHalo plan and named you first.`,
        "",
        `Vault: ${details.vaultRef}`,
        `Your key: ${details.key}`,
        "",
        `Keep this key. If anything happens to ${details.ownerName}, you use it to ask for the vault to be opened:`,
        details.url,
        "",
        "PayHalo staff cannot see this key and cannot open the vault without it.",
      ].join("\n"),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { sent: false, reason: `Email provider refused the message (${res.status}) ${detail.slice(0, 120)}`.trim() };
  }
  return { sent: true };
}

export async function sendSignInLink(to: string, url: string): Promise<MailResult> {
  if (!mailConfigured()) {
    return { sent: false, reason: "Email delivery is not configured on this deployment." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${(process.env.RESEND_API_KEY ?? "").trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: (process.env.MAIL_FROM ?? "").trim(),
      to: [to],
      subject: "Your VIVO sign-in link",
      text: [
        "Here is your sign-in link. It works once, for 20 minutes.",
        "",
        url,
        "",
        "If you did not ask for this, ignore the message — nothing changes.",
      ].join("\n"),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { sent: false, reason: `Email provider refused the message (${res.status}) ${detail.slice(0, 120)}`.trim() };
  }
  return { sent: true };
}
