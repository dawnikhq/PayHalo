import { NextResponse } from "next/server";
import { verifyState } from "@/lib/paypal";
import { readTicket, savePayerLink, spendTicket } from "@/lib/paypal-identity";
import { accountByEmail, createAccount, startLoginToken } from "@/lib/accounts";
import { mailConfigured, sendConfirmAddress, sendSignInLink } from "@/lib/mailer";
import { ensureWallet } from "@/lib/wallet";
import { clientKey, tooMany } from "@/lib/throttle";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONFIRM_HOURS = 24;

/**
 * The address PayPal did not give us.
 *
 * PayPal proved the person; this proves the mailbox, exactly the way a password
 * sign-up does — a link, opened from the inbox. Nothing here opens a session on
 * its own, and an address that is already registered is never handed over: that
 * case gets a sign-in link instead, so knowing someone's email is never enough
 * to walk into their plan.
 */
export async function POST(request: Request) {
  if (tooMany(clientKey(request, "paypal-email"), 12, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { ticket?: unknown; email?: unknown } | null;
  const rawTicket = typeof body?.ticket === "string" ? body.ticket : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const sid = verifyState(rawTicket);
  const pending = sid ? await readTicket(sid).catch(() => null) : null;
  if (!pending) {
    return NextResponse.json(
      { error: "That PayPal sign-in has expired. Start again — it takes one click." },
      { status: 400 },
    );
  }

  if (!mailConfigured()) {
    return NextResponse.json(
      { error: "We cannot send email right now, so there is no way to prove that address. Sign in with a password instead." },
      { status: 503 },
    );
  }

  const origin = pending.origin || new URL(request.url).origin;
  const next = pending.next || "/dashboard";

  try {
    const existing = await accountByEmail(email);

    if (existing) {
      /* Never sign someone in to an account they have only named. A link is the proof. */
      const token = await startLoginToken(existing.id, "signin");
      const url = new URL("/auth/link", origin);
      url.searchParams.set("token", token);
      url.searchParams.set("next", next);
      const mail = await sendSignInLink(existing.email, url.toString());
      if (!mail.sent) {
        return NextResponse.json(
          { error: "We could not send that email just now. Try again in a moment, or sign in with a password." },
          { status: 502 },
        );
      }
      await savePayerLink({
        payerId: pending.payerId,
        accountId: existing.id,
        email: existing.email,
        linkedAt: new Date().toISOString(),
      }).catch(() => undefined);
      await spendTicket(pending);
      return NextResponse.json({ ok: true, sentTo: existing.email, existing: true });
    }

    const name = pending.name?.trim() || null;
    const created = await createAccount(email, name, null);
    const account = created === "exists" ? await accountByEmail(email) : created;
    if (!account) {
      return NextResponse.json({ error: "That address could not be opened. Try again." }, { status: 502 });
    }

    await ensureWallet(account).catch(() => undefined);

    const token = await startLoginToken(account.id, "confirm-email", CONFIRM_HOURS * 60);
    const url = new URL("/auth/confirm", origin);
    url.searchParams.set("token", token);
    if (next !== "/dashboard") url.searchParams.set("next", next);

    const mail = await sendConfirmAddress(email, {
      name: name ?? email.split("@")[0] ?? "there",
      url: url.toString(),
      hours: CONFIRM_HOURS,
    });
    if (!mail.sent) {
      return NextResponse.json(
        { error: "We could not send that email just now. Try again in a moment, or sign in with a password." },
        { status: 502 },
      );
    }

    await savePayerLink({
      payerId: pending.payerId,
      accountId: account.id,
      email: account.email,
      linkedAt: new Date().toISOString(),
    }).catch(() => undefined);
    await spendTicket(pending);

    return NextResponse.json({ ok: true, sentTo: email, existing: false });
  } catch {
    /* No stack traces, no provider names: a person needs the next step, not the plumbing. */
    return NextResponse.json(
      { error: "That did not go through just now. Try again in a moment, or sign in with a password." },
      { status: 503 },
    );
  }
}
