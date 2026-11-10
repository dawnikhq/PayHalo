import { NextResponse } from "next/server";
import { accountByEmail, startSession } from "@/lib/accounts";
import { verifyPassword } from "@/lib/passwords";
import { setSessionCookie } from "@/lib/session";
import { clientKey, tooMany } from "@/lib/throttle";

export const dynamic = "force-dynamic";

/** A hash to compare against when the email is unknown, so timing says nothing. */
const DECOY = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

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

    await setSessionCookie(await startSession(account.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sign you in." },
      { status: 503 },
    );
  }
}
