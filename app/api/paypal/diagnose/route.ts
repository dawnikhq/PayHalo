import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { diagnosePayPal, paypalConfigured } from "@/lib/paypal";

export const dynamic = "force-dynamic";

/**
 * GET /api/paypal/diagnose — ask PayPal whether this deployment's credentials
 * actually work, instead of guessing from a failed checkout.
 *
 * Owner-only by default. `?key=` is honoured for a machine probe when
 * PAYPAL_DIAGNOSE_KEY is set, which is how the deployment gets checked without
 * a browser session. No secret is ever returned: shapes only.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = process.env.PAYPAL_DIAGNOSE_KEY?.trim();
  const given = url.searchParams.get("key") ?? "";

  let allowed = false;
  if (key && given) {
    const a = crypto.createHash("sha256").update(given).digest();
    const b = crypto.createHash("sha256").update(key).digest();
    allowed = crypto.timingSafeEqual(a, b);
  }

  if (!allowed) {
    const { requireOwner } = await import("@/lib/scope");
    try {
      await requireOwner();
      allowed = true;
    } catch {
      allowed = false;
    }
  }

  if (!allowed) return NextResponse.json({ error: "Not available." }, { status: 401 });
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "PayPal is not configured on this deployment." }, { status: 503 });
  }

  const report = await diagnosePayPal(request.url);
  return NextResponse.json(report, { headers: { "cache-control": "no-store" } });
}
