import { NextResponse, type NextRequest } from "next/server";
import { captureDepositOrder, PayPalError } from "@/lib/paypal";
import { requireOwner } from "@/lib/scope";

export const dynamic = "force-dynamic";

const FUND_COOKIE = "vivo_fund";

/**
 * PayPal sends the payer back here after approval. The order id comes from an
 * httpOnly cookie we set when the flow started — never from the query string,
 * so a visitor cannot make us capture somebody else's order.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  try {
    await requireOwner();
  } catch {
    return NextResponse.redirect(new URL("/signin?next=%2Fsettings", origin));
  }

  const orderId = request.cookies.get(FUND_COOKIE)?.value;
  if (!orderId) {
    return NextResponse.redirect(new URL("/settings?funded=expired", origin));
  }

  try {
    const capture = await captureDepositOrder(orderId);
    const res = NextResponse.redirect(
      new URL(`/settings?funded=${encodeURIComponent(capture.amount ?? "done")}`, origin),
    );
    res.cookies.delete(FUND_COOKIE);
    return res;
  } catch (error) {
    const reason = error instanceof PayPalError ? error.message : "PayPal did not complete the payment.";
    const res = NextResponse.redirect(new URL(`/settings?funded=failed&reason=${encodeURIComponent(reason)}`, origin));
    res.cookies.delete(FUND_COOKIE);
    return res;
  }
}
