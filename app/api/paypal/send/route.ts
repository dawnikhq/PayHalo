import { NextResponse } from "next/server";
import {
  checkReleasePasscode,
  paypalConfigured,
  paypalMode,
  payoutsBlockedReason,
  payoutsEnabled,
  releasePasscodeConfigured,
  sendToRecipient,
  PayPalError,
} from "@/lib/paypal";
import { clearFailures, clientKey, isLockedOut, registerFailure } from "@/lib/paypal-guard";
import { recordMoveAction } from "@/lib/store";
import { requireOwner } from "@/lib/scope";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_CENTS = 500_000;

/**
 * POST /api/paypal/send — money out to one person, the way a bank app does it.
 *
 * Outbound money is the most dangerous button in the product, so it carries the
 * same guards as a release: configured, enabled, same-origin, passcode,
 * lockout, and an explicit amount ceiling. Unlike a release it has no 14-day
 * window — the owner is alive and asking.
 */
async function handlePOST(request: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "PayPal is not available right now." }, { status: 503 });
  }
  if (!payoutsEnabled()) {
    return NextResponse.json({ error: payoutsBlockedReason() ?? "Sending money is switched off." }, { status: 403 });
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

  if (!releasePasscodeConfigured()) {
    return NextResponse.json({ error: "No release passcode is configured, so money cannot leave." }, { status: 503 });
  }

  const key = clientKey(request);
  const lock = isLockedOut(key);
  if (lock.locked) {
    return NextResponse.json(
      { error: "Too many wrong passcodes. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(lock.retryInMs / 1000)) } },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; amountCents?: unknown; note?: unknown; passcode?: unknown }
    | null;

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) : "";
  const amountCents = Math.round(Number(body?.amountCents ?? 0));
  const passcode = typeof body?.passcode === "string" ? body.passcode : "";

  if (!EMAIL.test(email)) return NextResponse.json({ error: "Enter the payer's PayPal email." }, { status: 400 });
  if (!Number.isFinite(amountCents) || amountCents < 100) {
    return NextResponse.json({ error: "Send at least 1.00." }, { status: 400 });
  }
  if (amountCents > MAX_CENTS) return NextResponse.json({ error: "That is above the per-transfer limit." }, { status: 400 });

  if (!passcode || !checkReleasePasscode(passcode)) {
    const state = registerFailure(key);
    return NextResponse.json(
      { error: state.allowed ? "That passcode is not right." : "Too many wrong passcodes. Try again shortly." },
      { status: state.allowed ? 403 : 429 },
    );
  }
  clearFailures(key);

  try {
    const result = await sendToRecipient(email, amountCents, note);
    await recordMoveAction({
      kind: "out",
      amountCents,
      counterparty: email,
      note,
      status: "recorded",
      providerId: result.batchId,
    });
    return NextResponse.json({ ok: true, batchId: result.batchId, status: result.status, mode: paypalMode() });
  } catch (error) {
    const upstream = error instanceof PayPalError ? error.status : 502;
    const message = error instanceof Error ? error.message : "PayPal did not accept the payment.";
    /* The owner is told what happened to their money, not which switch to flip.
       The operator console carries the diagnosis. */
    const plain =
      upstream === 403 || upstream === 404
        ? "Sending is not available on this account just now. Nothing left your account."
        : `PayPal did not accept that payment. ${message}`.slice(0, 220);
    return NextResponse.json({ error: plain }, { status: 502 });
  }
}

export const POST = guarded(handlePOST);
