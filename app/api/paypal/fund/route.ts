import { NextResponse, type NextRequest } from "next/server";
import { createDepositOrder, paypalConfigured, paypalMode, PayPalError } from "@/lib/paypal";
import { requireOwner } from "@/lib/scope";

export const dynamic = "force-dynamic";

const FUND_COOKIE = "vivo_fund";
const CURRENCY = "USD";

/** Same-origin only: a funding flow started from another site is not one. */
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * Opens a real PayPal order so the owner can move money into the release
 * account. Nothing is captured here — the payer approves at PayPal, and the
 * return URL captures it.
 */
export async function POST(request: NextRequest) {
  try {
    await requireOwner();
  } catch {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  if (!paypalConfigured()) {
    return NextResponse.json({ error: "PayPal is not configured on this deployment." }, { status: 503 });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { amount?: unknown } | null;
  const raw = typeof body?.amount === "string" ? body.amount.trim() : "";
  const amount = Number(raw);

  if (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(amount) || amount < 1 || amount > 10000) {
    return NextResponse.json({ error: "Enter an amount between 1 and 10,000." }, { status: 400 });
  }

  const origin = request.nextUrl.origin;

  try {
    const order = await createDepositOrder(
      amount.toFixed(2),
      CURRENCY,
      `${origin}/api/paypal/fund/return`,
      `${origin}/settings?funded=cancelled`,
    );

    const res = NextResponse.json({ approveUrl: order.approveUrl, mode: paypalMode() });
    res.cookies.set(FUND_COOKIE, order.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 30,
    });
    return res;
  } catch (error) {
    const status = error instanceof PayPalError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PayPal did not answer." },
      { status },
    );
  }
}
