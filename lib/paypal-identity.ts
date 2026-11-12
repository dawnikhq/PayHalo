import { getDriver } from "./storage";
import type { StateDoc } from "./model";

/**
 * A PayPal sign-in that arrives without an email address.
 *
 * "Log in with PayPal" can hand back the account id and nothing else when the
 * app has not been granted the Email scope. That is not a failure of the
 * person's identity — PayPal did prove who they are. It is only the address
 * that is missing, and the address is what PayHalo uses as the account.
 *
 * Two small records close the gap without inventing a claim we cannot make:
 *
 *   paypal:ticket:<sid>  a fifteen-minute note saying "this PayPal id has just
 *                        signed in, and here is where they were going"
 *   paypal:payer:<id>    the address they told us, once they have proved it by
 *                        opening the link we emailed
 *
 * The payer record is only ever a shortcut for a later sign-in. It never grants
 * access on its own: the callback still checks that the account's address has
 * been confirmed, and sends a fresh link when it has not.
 */

const PAYER = "paypal:payer:";
const TICKET = "paypal:ticket:";

/** Long enough to type an address, short enough to be useless later. */
export const TICKET_MINUTES = 15;

export interface PayPalPayer {
  payerId: string;
  accountId: string;
  email: string;
  linkedAt: string;
}

export interface PayPalTicket {
  sid: string;
  /** Empty when PayPal shared nothing at all; the email step still works. */
  payerId: string;
  name: string | null;
  from: "signin" | "signup";
  next: string;
  /** The host the person started on, so the emailed link returns them there. */
  origin: string;
  issuedAt: string;
  /** Set once the ticket has been spent, so it cannot be replayed. */
  usedAt?: string | null;
}

function wrap(key: string, value: unknown): StateDoc {
  return { [key]: value } as unknown as StateDoc;
}

function unwrap<T>(doc: StateDoc | null, key: string): T | null {
  if (!doc) return null;
  const value = (doc as unknown as Record<string, T | undefined>)[key];
  return value ?? null;
}

/* ------------------------------------------------------------- the ticket */

export async function saveTicket(ticket: PayPalTicket): Promise<void> {
  const driver = await getDriver();
  await driver.save(TICKET + ticket.sid, wrap("paypalTicket", ticket));
}

export async function readTicket(sid: string): Promise<PayPalTicket | null> {
  if (!sid) return null;
  const driver = await getDriver();
  const ticket = unwrap<PayPalTicket>(await driver.load(TICKET + sid), "paypalTicket");
  if (!ticket || typeof ticket.issuedAt !== "string") return null;
  if (ticket.usedAt) return null;
  const age = Date.now() - Date.parse(ticket.issuedAt);
  if (!Number.isFinite(age) || age > TICKET_MINUTES * 60 * 1000) return null;
  return ticket;
}

/** A ticket is spent once, whichever way the exchange ends. */
export async function spendTicket(ticket: PayPalTicket): Promise<void> {
  const driver = await getDriver();
  await driver.save(TICKET + ticket.sid, wrap("paypalTicket", { ...ticket, usedAt: new Date().toISOString() }));
}

/* ------------------------------------------------------- the payer record */

export async function savePayerLink(link: PayPalPayer): Promise<void> {
  if (!link.payerId) return;
  const driver = await getDriver();
  await driver.save(PAYER + link.payerId, wrap("paypalPayer", link));
}

export async function payerLink(payerId: string): Promise<PayPalPayer | null> {
  if (!payerId) return null;
  try {
    const driver = await getDriver();
    const link = unwrap<PayPalPayer>(await driver.load(PAYER + payerId), "paypalPayer");
    if (!link || typeof link.accountId !== "string" || !link.accountId) return null;
    return link;
  } catch {
    /* A missing shortcut is not an error: the email step covers it. */
    return null;
  }
}
