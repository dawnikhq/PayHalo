import { NextResponse } from "next/server";
import { createAccount, startLoginToken } from "@/lib/accounts";
import { ensureWallet } from "@/lib/wallet";
import { hashPassword, passwordProblem } from "@/lib/passwords";
import { mailConfigured, sendConfirmAddress } from "@/lib/mailer";
import { clientKey, tooMany } from "@/lib/throttle";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONFIRM_HOURS = 24;

/**
 * Signing up does not sign anyone in.
 *
 * The row is written unconfirmed, a link goes to the address typed in, and the
 * account only counts once that link is opened. A mistyped address therefore
 * leaves nothing usable behind, and nobody can be created by someone else.
 */
export async function POST(request: Request) {
  if (tooMany(clientKey(request, "signup"), 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: unknown; email?: unknown; password?: unknown; next?: unknown }
    | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  /* where to land after confirming — only ever a path on this site */
  const rawNext = typeof body?.next === "string" ? body.next : "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext.slice(0, 120) : "";

  if (!EMAIL.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Tell us what to call you." }, { status: 400 });
  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (!mailConfigured()) {
    return NextResponse.json(
      { error: "Email confirmation is not available on this deployment yet, so no account can be opened." },
      { status: 503 },
    );
  }

  try {
    const account = await createAccount(email, name, await hashPassword(password));
    if (account === "exists") {
      return NextResponse.json({ error: "That address already has a plan. Sign in instead." }, { status: 409 });
    }

    /*
     * The demo balance is granted with the account, not with the first visit to
     * the money page, so a new person already has their $20,000 and their
     * handle waiting for them. Failure here must not cost anyone an account.
     */
    await ensureWallet(account).catch(() => undefined);

    const token = await startLoginToken(account.id, "confirm-email", CONFIRM_HOURS * 60);
    const url = new URL(
      `/auth/confirm?token=${encodeURIComponent(token)}${next ? `&next=${encodeURIComponent(next)}` : ""}`,
      request.url,
    ).toString();
    const mail = await sendConfirmAddress(email, { name, url, hours: CONFIRM_HOURS });

    if (!mail.sent) {
      return NextResponse.json(
        { error: mail.reason ?? "We could not send the confirmation email. Try again in a moment." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, confirmEmail: true, email });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create the account." },
      { status: 503 },
    );
  }
}
