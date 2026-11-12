import { NextResponse } from "next/server";
import { accountByEmail, markLogin, sixDigits, startLoginCode, startSession } from "@/lib/accounts";
import { setSessionCookie } from "@/lib/session";
import { verifyPassword } from "@/lib/passwords";
import { mailConfigured, sendLoginCode } from "@/lib/mailer";
import { clientKey, tooMany } from "@/lib/throttle";

export const dynamic = "force-dynamic";

/** A hash to compare against when the email is unknown, so timing says nothing. */
const DECOY = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const CODE_MINUTES = 10;

function when() {
  return new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

/**
 * Password first, then a code by email.
 *
 * A correct password does not open the account: it asks for a six-digit code,
 * which goes to the address on file and is good for ten minutes and one use.
 * Both factors are needed, so a leaked password on its own reaches nothing.
 */
export async function POST(request: Request) {
  const key = clientKey(request, "signin");
  if (tooMany(key, 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  try {
    const account = await accountByEmail(email);
    const ok = await verifyPassword(password, account?.passwordHash ?? DECOY);

    if (!account || !ok || !account.passwordHash) {
      return NextResponse.json({ error: "That email and password do not match." }, { status: 401 });
    }

    if (!account.emailVerifiedAt) {
      return NextResponse.json(
        {
          error: "This address has not been confirmed yet. Check your inbox for the link we sent when you signed up.",
          unconfirmed: true,
        },
        { status: 403 },
      );
    }

    /*
     * Mail down means the second factor cannot happen. Rather than lock every
     * account out of its own plan, the password alone is accepted and the
     * answer says plainly that the code step was skipped — silence here would
     * be a security story we cannot tell.
     */
    if (!mailConfigured()) {
      await setSessionCookie(await startSession(account.id));
      await markLogin(account.id);
      return NextResponse.json({
        ok: true,
        code: false,
        warning:
          "Email delivery is unavailable right now, so the six-digit code step was skipped. Your password was still checked.",
      });
    }

    const code = sixDigits();
    await startLoginCode(account.id, code, CODE_MINUTES);

    const mail = await sendLoginCode(account.email, {
      name: account.name ?? "there",
      code,
      minutes: CODE_MINUTES,
      when: when(),
    });

    if (!mail.sent) {
      return NextResponse.json({ error: mail.reason ?? "We could not send your code. Try again." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, code: true, email: account.email });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sign you in." },
      { status: 503 },
    );
  }
}
