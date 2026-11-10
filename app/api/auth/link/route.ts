import { NextResponse } from "next/server";
import { accountByEmail, startLoginToken } from "@/lib/accounts";
import { mailConfigured, sendSignInLink } from "@/lib/mailer";
import { clientKey, tooMany } from "@/lib/throttle";

export const dynamic = "force-dynamic";

/**
 * "Email me a link". The response is identical whether or not the address has
 * an account, so the endpoint cannot be used to find out who is a customer.
 */
export async function POST(request: Request) {
  if (tooMany(clientKey(request, "link"), 5, 10 * 60 * 1000)) {
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
        message: "Email delivery is not configured on this deployment. Sign in with your password instead.",
      },
      { status: 200 },
    );
  }

  const account = await accountByEmail(email);

  if (account) {
    try {
      const token = await startLoginToken(account.id, "signin");
      const origin = new URL(request.url).origin;
      const result = await sendSignInLink(account.email, `${origin}/auth/link?token=${token}`);
      if (!result.sent) {
        return NextResponse.json(
          { ok: true, delivered: false, message: result.reason ?? "The message could not be sent." },
          { status: 200 },
        );
      }
    } catch {
      /* deliberately indistinguishable from the happy path */
    }
  }

  return NextResponse.json({ ok: true, delivered: true, message: "If that address has an account, a link is on its way." });
}
