import { NextResponse } from "next/server";
import { accountByEmail, startLoginToken } from "@/lib/accounts";
import { mailConfigured, sendConfirmAddress } from "@/lib/mailer";
import { clientKey, tooMany } from "@/lib/throttle";

export const dynamic = "force-dynamic";

const CONFIRM_HOURS = 24;

/**
 * "Send it again." Always the same answer, whether or not the address is known.
 */
export async function POST(request: Request) {
  if (tooMany(clientKey(request, "resend-confirm"), 4, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown; next?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const rawNext = typeof body?.next === "string" ? body.next : "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext.slice(0, 120) : "";
  if (!email) return NextResponse.json({ error: "Enter your email address." }, { status: 400 });

  const same = { ok: true, message: "If that address is waiting to be confirmed, a fresh link is on its way." };
  if (!mailConfigured()) return NextResponse.json(same);

  try {
    const account = await accountByEmail(email);
    if (account && !account.emailVerifiedAt) {
      const token = await startLoginToken(account.id, "confirm-email", CONFIRM_HOURS * 60);
      const url = new URL(
        `/auth/confirm?token=${encodeURIComponent(token)}${next ? `&next=${encodeURIComponent(next)}` : ""}`,
        request.url,
      ).toString();
      await sendConfirmAddress(account.email, {
        name: account.name ?? "there",
        url,
        hours: CONFIRM_HOURS,
      });
    }
    return NextResponse.json(same);
  } catch {
    return NextResponse.json(same);
  }
}
