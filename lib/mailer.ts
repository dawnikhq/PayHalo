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
