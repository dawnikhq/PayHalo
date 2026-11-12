import { NextResponse } from "next/server";
import { accountById, dropSessionsForUser, redeemLoginToken, setPassword } from "@/lib/accounts";
import { hashPassword, passwordProblem } from "@/lib/passwords";
import { mailConfigured, sendPasswordResetNotice } from "@/lib/mailer";
import { clientKey, tooMany } from "@/lib/throttle";

export const dynamic = "force-dynamic";

/**
 * Spend a reset link and set a new password.
 *
 * The token is one-use and short-lived, and it is redeemed — and thereby
 * consumed — only once the new password passes the same rules as sign-up, so a
 * rejected password does not burn the link. A password change ends every
 * existing session, so an old login cannot survive a reset. A quiet note goes
 * out afterwards, so the account holder learns the same minute if it was not
 * them.
 */
export async function POST(request: Request) {
  if (tooMany(clientKey(request, "reset"), 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { token?: unknown; password?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!token) {
    return NextResponse.json({ error: "That reset link is not right. Ask for a new one." }, { status: 400 });
  }

  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const userId = await redeemLoginToken(token, "set-password");
    if (!userId) {
      return NextResponse.json(
        { error: "That reset link has expired or was already used. Request a new one." },
        { status: 401 },
      );
    }

    await setPassword(userId, await hashPassword(password));
    await dropSessionsForUser(userId);

    const account = await accountById(userId);
    if (mailConfigured() && account) {
      const when = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
      const place =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "an unknown network";
      await sendPasswordResetNotice(account.email, {
        name: account.name ?? "there",
        when,
        place,
      }).catch(() => null);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not reset your password." },
      { status: 503 },
    );
  }
}
