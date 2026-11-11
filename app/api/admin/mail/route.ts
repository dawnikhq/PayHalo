import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { mailConfigured, sendVaultKey } from "@/lib/mailer";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/mail — prove the email path from the operator console.
 * It sends the same template a finished plan sends, to an address the operator
 * chooses, so setup can be verified without inventing a plan.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Operator sign-in required." }, { status: 401 });
  }
  if (!mailConfigured()) {
    return NextResponse.json({ error: "BREVO_API_KEY and MAIL_FROM are not both set." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { to?: unknown } | null;
  const to = typeof body?.to === "string" ? body.to.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return NextResponse.json({ error: "Enter an address to test with." }, { status: 400 });
  }

  const result = await sendVaultKey(to, {
    ownerName: "A PayHalo member",
    vaultRef: "PH-DEMO-000",
    key: "PH-DEMO-000-AAAAA-BBBBB",
    url: new URL("/beneficiary", request.url).toString(),
  });

  return NextResponse.json(result, { status: result.sent ? 200 : 502 });
}

/**
 * GET /api/admin/mail?to=…&key=… — the same send, for a machine probe. The key is
 * the operator passcode, compared in constant time, so a deployment can be
 * checked from a terminal or a health check without a browser session.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const expected = (process.env.ADMIN_PASSCODE ?? "").trim();
  const given = (url.searchParams.get("key") ?? "").trim();
  if (!expected || !given) {
    return NextResponse.json({ error: "Operator sign-in required." }, { status: 401 });
  }
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Operator sign-in required." }, { status: 401 });
  }
  if (!mailConfigured()) {
    return NextResponse.json({ error: "BREVO_API_KEY and MAIL_FROM are not both set." }, { status: 503 });
  }

  const to = (url.searchParams.get("to") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return NextResponse.json({ error: "Enter an address to test with." }, { status: 400 });
  }

  const result = await sendVaultKey(to, {
    ownerName: "A PayHalo member",
    vaultRef: "PH-DEMO-000",
    key: "PH-DEMO-000-AAAAA-BBBBB",
    url: new URL("/beneficiary", request.url).toString(),
  });

  return NextResponse.json(result, { status: result.sent ? 200 : 502 });
}
