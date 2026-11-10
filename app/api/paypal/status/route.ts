import { NextResponse } from "next/server";
import {
  getAppBalances,
  paypalConfigured,
  paypalMode,
  payoutsBlockedReason,
  payoutsEnabled,
  releasePasscodeConfigured,
  PayPalError,
} from "@/lib/paypal";
import { readSid } from "@/lib/paypal-session";
import { getPayPalConnection, listPayPalPayouts } from "@/lib/paypal-store";
import { getReleaseLedger } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Everything the Settings card needs, in one round trip. The access token is
 * deliberately not part of this payload — the browser learns that an account
 * is connected, never how to act as it.
 */
export async function GET() {
  const sid = await readSid();
  const mode = paypalMode();
  const configured = paypalConfigured();

  const connection = await getPayPalConnection(sid);
  const expired = connection?.expiresAt ? Date.parse(connection.expiresAt) <= Date.now() : false;

  let payoutAccount:
    | { ok: true; balances: { currency: string; total: string; available: string; primary: boolean }[] }
    | { ok: false; reason: string; status: number }
    | null = null;

  if (configured) {
    try {
      const { balances } = await getAppBalances();
      payoutAccount = { ok: true, balances };
    } catch (error) {
      const status = error instanceof PayPalError ? error.status : 500;
      payoutAccount = {
        ok: false,
        status,
        reason:
          status === 403
            ? "This PayPal app has not been granted the reporting/balances scope, so the payout balance cannot be read."
            : error instanceof Error
              ? error.message
              : "PayPal did not answer.",
      };
    }
  }

  const ledger = await getReleaseLedger();
  const ledgerPayouts = ledger ? await listPayPalPayouts(ledger.claimId) : [];

  return NextResponse.json({
    configured,
    mode,
    payouts: {
      enabled: payoutsEnabled(),
      blockedReason: payoutsBlockedReason(),
      passcodeRequired: releasePasscodeConfigured(),
    },
    connection:
      connection && sid
        ? {
            email: connection.email,
            name: connection.name,
            payerId: connection.payerId,
            connectedAt: connection.connectedAt,
            expired,
          }
        : null,
    payoutAccount,
    ledger: ledger
      ? {
          claimId: ledger.claimId,
          distributedAt: ledger.distributedAt,
          totalCents: ledger.totalCents,
          rows: ledger.rows.map((row) => {
            const paid = ledgerPayouts.find((p) => p.beneficiaryId === row.beneficiaryId && p.status !== "failed");
            return {
              name: row.name,
              email: row.email,
              amountCents: row.amountCents,
              paid: Boolean(paid),
              batchId: paid?.batchId ?? null,
              status: paid?.status ?? null,
            };
          }),
        }
      : null,
  });
}
