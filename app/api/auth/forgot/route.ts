import { NextResponse } from "next/server";
import { accountByEmail, startLoginToken } from "@/lib/accounts";
import { mailConfigured, sendPasswordReset } from "@/lib/mailer";
import { clientKey, tooMany } from "@/lib/throttle";

export const dynamic = "force-dynamic";

const MINUTES = 60;

/**
 * POST /api/auth/forgot — "I cannot get in".
 *
 * The answer is the same whether or not the address has an account, so this
 * endpoint cannot be used to discover who is a member. A link is only minted
 * and only mailed when the account is real.
 */
export async function POST(request: Request) {
  if (tooMany(clientKey(request, "forgot"), 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "Enter the email on your account." }, { status: 400 });

  const generic = {
    ok: true,
    delivered: true,
    message: "If that address has a PayHalo account, a reset link is on its way. It works once, and for an hour.",
  };

  try {
    const account = await accountByEmail(email);
    if (!account) return NextResponse.json(generic);

    if (!mailConfigured()) {
      return NextResponse.json({
        ok: true,
        delivered: false,
        message:
          "Email delivery is not connected on this deployment, so a reset link cannot be sent right now. Sign in with a one-time link instead.",
      });
    }

    const token = await startLoginToken(account.id, "set-password", MINUTES);
    const origin = new URL(request.url).origin;
    const mail = await sendPasswordReset(account.email, {
      name: account.name,
      url: `${origin}/reset?token=${encodeURIComponent(token)}`,
      minutes: MINUTES,
    });

    return NextResponse.json({
      ...generic,
      delivered: mail.sent,
      message: mail.sent
        ? generic.message
        : "We could not hand the message to the mail service. Try again in a moment.",
    });
  } catch {
    /* never leak which side failed */
    return NextResponse.json(generic);
  }
}
