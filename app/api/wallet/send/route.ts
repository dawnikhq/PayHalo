import { NextResponse, type NextRequest } from "next/server";
import { guarded } from "@/lib/route-guard";
import { requireOwner } from "@/lib/scope";
import { transferDemoMoney } from "@/lib/wallet";
import { clientKey, tooMany } from "@/lib/throttle";

export const dynamic = "force-dynamic";

/** Same-origin only. A transfer started from another site is not a transfer. */
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
 * POST /api/wallet/send — demo money to another PayHalo handle.
 *
 * The amount arrives as a decimal string, because that is what was typed, and
 * is converted once, here, so no rounding happens in the browser or in the
 * ledger. Nothing is emailed and nothing reaches PayPal: this is the internal
 * balance, and the page says so.
 */
async function handlePOST(request: NextRequest) {
  const owner = await requireOwner();

  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  }
  if (tooMany(clientKey(request, "wallet-send"), 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "That is a lot of transfers at once. Try again shortly." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { handle?: unknown; amount?: unknown; note?: unknown } | null;
  const handle = typeof body?.handle === "string" ? body.handle.trim() : "";
  const amount = typeof body?.amount === "string" ? body.amount.trim() : "";
  const note = typeof body?.note === "string" ? body.note : "";

  if (!handle) return NextResponse.json({ error: "Add the handle you are sending to." }, { status: 400 });
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    return NextResponse.json({ error: "Enter an amount like 250 or 250.00." }, { status: 400 });
  }

  const cents = Math.round(Number(amount) * 100);
  const result = await transferDemoMoney(owner, handle, cents, note);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    ok: true,
    balanceCents: result.wallet.balanceCents,
    to: result.to,
    entry: result.wallet.entries[0],
  });
}

export const POST = guarded(handlePOST);
