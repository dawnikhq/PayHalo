import { NextResponse } from "next/server";
import { markEmailVerified, markLogin, redeemLoginToken, setPassword, startSession } from "@/lib/accounts";
import { hashPassword, passwordProblem } from "@/lib/passwords";
import { setSessionCookie } from "@/lib/session";
import { clientKey, tooMany } from "@/lib/throttle";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset — spend a reset link and set a new password.
 *
 * The link is single-use and dies on first read, so a second submission of the
 * same page cannot silently change the password again.
 */
export async function POST(request: Request) {
  if (tooMany(clientKey(request, "reset"), 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { token?: unknown; password?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!token) return NextResponse.json({ error: "This reset link is incomplete. Ask for a new one." }, { status: 400 });

  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const userId = await redeemLoginToken(token, "set-password");
    if (!userId) {
      return NextResponse.json(
        { error: "That reset link has expired or was already used. Ask for a new one." },
        { status: 400 },
      );
    }

    await setPassword(userId, await hashPassword(password));
    await markEmailVerified(userId);
    await setSessionCookie(await startSession(userId));
    await markLogin(userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The password could not be changed." },
      { status: 503 },
    );
  }
}
