import { NextResponse } from "next/server";
import { paypalConfigured, paypalMode, requestPayment, PayPalError } from "@/lib/paypal";
import { recordMoveAction } from "@/lib/store";
import { requireOwner } from "@/lib/scope";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/paypal/receive — ask someone to pay into the plan. PayPal emails
 * them an invoice; nothing is taken until they settle it themselves.
 */
async function handlePOST(request: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "PayPal is not configured on this deployment." }, { status: 503 });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) {
        return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
    }
  }

  await requireOwner();

  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; amountCents?: unknown; note?: unknown }
    | null;

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) : "";
  const amountCents = Math.round(Number(body?.amountCents ?? 0));

  if (!EMAIL.test(email)) return NextResponse.json({ error: "Enter the payer's email." }, { status: 400 });
  if (!Number.isFinite(amountCents) || amountCents < 100) {
    return NextResponse.json({ error: "Request at least 1.00." }, { status: 400 });
  }

  try {
    const invoice = await requestPayment(email, amountCents, note);
    await recordMoveAction({
      kind: "in",
      amountCents,
      counterparty: email,
      note,
      status: "pending",
      providerId: invoice.invoiceId,
    });
    return NextResponse.json({ ok: true, invoiceId: invoice.invoiceId, status: invoice.status, mode: paypalMode() });
  } catch (error) {
    const status = error instanceof PayPalError ? error.status : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PayPal could not raise the request." },
      { status },
    );
  }
}

export const POST = guarded(handlePOST);
