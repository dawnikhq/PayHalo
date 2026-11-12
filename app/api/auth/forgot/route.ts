import { NextResponse } from "next/server";
import { accountByEmail, startLoginToken } from "@/lib/accounts";
import { mailConfigured, sendPasswordReset } from "@/lib/mailer";
import { clientKey, tooMany } from "@/lib/throttle";

export const dynamic = "force-dynamic";

const RESET_MINUTES = 30;

/**
 * "Forgot your password?"
 *
 * The answer is identical whether or not the address has an account, so the
 * endpoint cannot be used to find out who is a customer. When the address is
 * known and delivery is configured, a one-time link that only sets a new
 * password goes to it. The link proves the mailbox is the account holder's; it
 * does not open the plan.
 */
export async function POST(request: Request) {
  if (tooMany(clientKey(request, "forgot"), 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "Enter your email address." }, { status: 400 });

  /*
   * Checked before any lookup: with no provider configured, every address gets
   * the same answer, so the endpoint cannot be used to test who has an account.
   */
  if (!mailConfigured()) {
    return NextResponse.json(
      {
        ok: true,
        delivered: false,
        message: "Email delivery is not configured on this deployment, so a reset link cannot be sent.",
      },
      { status: 200 },
    );
  }

  const same = {
    ok: true,
    delivered: true,
    message: "If that address has an account, a reset link is on its way.",
  };

  try {
    const account = await accountByEmail(email);
    if (account) {
      const token = await startLoginToken(account.id, "set-password", RESET_MINUTES);
      const url = new URL(`/reset-password?token=${encodeURIComponent(token)}`, request.url).toString();
      const mail = await sendPasswordReset(email, {
        name: account.name ?? "there",
        url,
        minutes: RESET_MINUTES,
      });
      if (!mail.sent) {
        return NextResponse.json(
          { ok: true, delivered: false, message: mail.reason ?? "The message could not be sent." },
          { status: 200 },
        );
      }
    }
    return NextResponse.json(same);
  } catch {
    /* deliberately indistinguishable from the happy path */
    return NextResponse.json(same);
  }
}
