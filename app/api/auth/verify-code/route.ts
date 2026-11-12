import { NextResponse } from "next/server";
import { accountByEmail, markLogin, redeemLoginCode, startSession } from "@/lib/accounts";
import { mailConfigured, sendLoginNotice } from "@/lib/mailer";
import { setSessionCookie } from "@/lib/session";
import { clientKey, tooMany } from "@/lib/throttle";

export const dynamic = "force-dynamic";

/**
 * The second half of sign-in: the six digits from the inbox.
 *
 * Wrong codes are rate-limited by address, the code is spent on success, and a
 * quiet note goes out afterwards saying the sign-in happened — so a person who
 * did not do it finds out the same minute it occurs.
 */
export async function POST(request: Request) {
  if (tooMany(clientKey(request, "verify-code"), 12, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown; code?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";

  if (!email || code.length !== 6) {
    return NextResponse.json({ error: "Enter the six-digit code from your email." }, { status: 400 });
  }

  try {
    const account = await accountByEmail(email);
    if (!account) return NextResponse.json({ error: "That code is not right, or it has expired." }, { status: 401 });

    const ok = await redeemLoginCode(account.id, code);
    if (!ok) return NextResponse.json({ error: "That code is not right, or it has expired." }, { status: 401 });

    await setSessionCookie(await startSession(account.id));
    await markLogin(account.id);

    if (mailConfigured()) {
      const when = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
      const place = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "an unknown network";
      await sendLoginNotice(account.email, {
        name: account.name ?? "there",
        when,
        place,
        resetUrl: `${new URL(request.url).origin}/reset?email=${encodeURIComponent(account.email)}`,
      }).catch(() => null);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sign you in." },
      { status: 503 },
    );
  }
}
