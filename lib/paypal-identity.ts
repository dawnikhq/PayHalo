import { getDriver } from "./storage";
import type { StateDoc } from "./model";

/**
 * The address a PayPal account is bound to.
 *
 * PayPal can hand back the account id and nothing else when the app has not
 * been granted the Email scope. The person has still proved who they are; only
 * the address is missing, and the address is what PayHalo keys an account to.
 *
 * The hand-off itself needs no storage — the ticket travels signed in the URL
 * (see `signTicket` in lib/paypal.ts), so it survives the hop between machines
 * a serverless deployment makes. This file keeps only the slow memory: once an
 * address has been confirmed, the PayPal id remembers it, so the next sign-in is
 * a single click instead of another question.
 *
 * The record is a shortcut, never a grant. The callback still checks that the
 * address was confirmed before it signs anyone in.
 */

const PAYER = "paypal:payer:";

export interface PayPalPayer {
  payerId: string;
  accountId: string;
  email: string;
  linkedAt: string;
}

function wrap(value: PayPalPayer): StateDoc {
  return { paypalPayer: value } as unknown as StateDoc;
}

export async function savePayerLink(link: PayPalPayer): Promise<void> {
  if (!link.payerId) return;
  const driver = await getDriver();
  await driver.save(PAYER + link.payerId, wrap(link));
}

export async function payerLink(payerId: string): Promise<PayPalPayer | null> {
  if (!payerId) return null;
  try {
    const driver = await getDriver();
    const doc = await driver.load(PAYER + payerId);
    if (!doc) return null;
    const link = (doc as unknown as { paypalPayer?: PayPalPayer }).paypalPayer;
    if (!link || typeof link.accountId !== "string" || !link.accountId) return null;
    return link;
  } catch {
    /* A missing shortcut is not an error: the one field covers it. */
    return null;
  }
}
