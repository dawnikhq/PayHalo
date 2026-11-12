import { NextResponse } from "next/server";
import {
  checkReleasePasscode,
  paypalConfigured,
  paypalMode,
  payoutsBlockedReason,
  payoutsEnabled,
  releasePasscodeConfigured,
  sendPayoutBatch,
  PayPalError,
} from "@/lib/paypal";
import { clearFailures, clientKey, isLockedOut, registerFailure } from "@/lib/paypal-guard";
import { listPayPalPayouts, recordPayPalPayout } from "@/lib/paypal-store";
import { getReleaseLedger } from "@/lib/store";
import { requireOwner } from "@/lib/scope";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/paypal/payout — release the estate through PayPal.
 *
 * Guards, in order:
 *   1. PayPal must be configured and payouts must be enabled (twice, for live).
 *   2. The 14-day window must have closed — the ledger is empty before that,
 *      so calling this early returns 409 rather than moving anything.
 *   3. The caller must confirm explicitly; there is no implicit release.
 *   4. Recipients already paid for this claim are skipped, so a retry after a
 *      timeout cannot double-pay.
 */
async function handlePOST(request: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "PayPal is not available right now." }, { status: 503 });
  }
  if (!payoutsEnabled()) {
    return NextResponse.json({ error: payoutsBlockedReason() ?? "Payouts are disabled." }, { status: 403 });
  }

  /* Same-origin only: a release must come from this app's own page. */
  const origin = request.headers.get("origin");
  if (origin) {
    const expected = new URL(request.url).origin;
    if (origin !== expected) {
      return NextResponse.json({ error: "Cross-origin releases are not allowed." }, { status: 403 });
    }
  }

  let body: { confirm?: boolean; passcode?: string } = {};
  try {
    body = (await request.json()) as { confirm?: boolean; passcode?: string };
  } catch {
    body = {};
  }
  if (body.confirm !== true) {
    return NextResponse.json({ error: "Send { confirm: true } to start a release." }, { status: 428 });
  }

  /* The release passcode: fail closed, constant-time, rate limited. */
  if (!releasePasscodeConfigured()) {
    return NextResponse.json({ error: "No release passcode is configured for this deployment." }, { status: 503 });
  }

  const who = clientKey(request);
  const lock = isLockedOut(who);
  if (lock.locked) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(lock.retryInMs / 60000)} minutes.` },
      { status: 429 },
    );
  }

  if (!checkReleasePasscode(String(body.passcode ?? ""))) {
    const attempt = registerFailure(who);
    return NextResponse.json(
      {
        error: attempt.allowed
          ? "That release passcode is not correct."
          : "Too many attempts. The release is locked for ten minutes.",
      },
      { status: 403 },
    );
  }
  clearFailures(who);

  const owner = await requireOwner();
  const ledger = await getReleaseLedger();
  if (!ledger) {
    return NextResponse.json(
      { error: "Nothing to release: the safety window has not closed on a verified claim." },
      { status: 409 },
    );
  }

  const existing = await listPayPalPayouts(owner.id, ledger.claimId);
  const settled = new Set(existing.filter((p) => p.status !== "failed").map((p) => p.beneficiaryId));
  const pending = ledger.rows.filter((row) => !settled.has(row.beneficiaryId));

  if (!pending.length) {
    return NextResponse.json({ ok: true, alreadySent: true, batchId: existing[0]?.batchId ?? null });
  }
  if (pending.length > 15) {
    return NextResponse.json({ error: "PayPal allows 15 recipients per batch; this plan has more." }, { status: 400 });
  }

  const mode = paypalMode();

  try {
    const batch = await sendPayoutBatch(
      ledger.claimId,
      pending.map((row) => ({
        email: row.email,
        amountCents: row.amountCents,
        note: `Planned handover released by PayHalo (${mode}).`,
        itemId: `claim-${ledger.claimId}-b${row.beneficiaryId}`,
      })),
    );

    for (const row of pending) {
      await recordPayPalPayout(owner.id, {
        claimId: ledger.claimId,
        beneficiaryId: row.beneficiaryId,
        email: row.email,
        amountCents: row.amountCents,
        currency: "USD",
        status: batch.status,
        batchId: batch.batchId,
        mode,
        error: null,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      batchId: batch.batchId,
      status: batch.status,
      sent: pending.length,
      totalCents: pending.reduce((sum, row) => sum + row.amountCents, 0),
    });
  } catch (error) {
    const message = error instanceof PayPalError ? error.message : error instanceof Error ? error.message : "Payout failed.";

    for (const row of pending) {
      await recordPayPalPayout(owner.id, {
        claimId: ledger.claimId,
        beneficiaryId: row.beneficiaryId,
        email: row.email,
        amountCents: row.amountCents,
        currency: "USD",
        status: "failed",
        batchId: null,
        mode,
        error: message,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: message, recorded: pending.length }, { status: 502 });
  }
}

export const POST = guarded(handlePOST);
