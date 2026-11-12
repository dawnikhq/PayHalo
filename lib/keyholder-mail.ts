import { accountByEmail } from "./accounts";
import { mailConfigured, sendKeyholderNamed, type MailResult } from "./mailer";

/**
 * Telling a Trusted Key they have been named — one place, so the first send and
 * any later re-send cannot drift apart.
 *
 * The message never contains the access code. Someone who already has a PayHalo
 * account is pointed at their portal; someone who does not is pointed at sign-up
 * with the named address, and finds the code inside the portal once the account
 * exists.
 */
export interface KeyholderNotice extends MailResult {
  to?: string;
  existingAccount: boolean;
  configured: boolean;
}

export async function notifyKeyholder(
  origin: string,
  details: { ownerName: string; keyholder: { name: string; email: string } | null },
): Promise<KeyholderNotice> {
  const keyholder = details.keyholder;
  if (!keyholder?.email) {
    return {
      sent: false,
      reason: "No email address on the Trusted Key.",
      existingAccount: false,
      configured: mailConfigured(),
    };
  }

  const existing = await accountByEmail(keyholder.email).catch(() => null);
  const portalUrl = existing ? `${origin}/signin?next=/keyholder` : `${origin}/keyholder`;
  const signupUrl = existing
    ? undefined
    : `${origin}/signup?email=${encodeURIComponent(keyholder.email)}&next=${encodeURIComponent("/keyholder")}`;

  const mail = await sendKeyholderNamed(keyholder.email, {
    keyholderName: keyholder.name,
    ownerName: details.ownerName || "The account holder",
    portalUrl,
    signupUrl,
  });

  return { ...mail, to: keyholder.email, existingAccount: Boolean(existing), configured: mailConfigured() };
}
