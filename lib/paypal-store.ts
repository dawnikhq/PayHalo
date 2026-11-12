import { getDriver } from "./storage";
import { emptyDoc, settle, type StateDoc } from "./model";
import type { PayPalConnection, PayPalPayout, PayPalState } from "./types";

/**
 * PayPal state lives in the same JSON document as the plan, so a demo reset
 * clears connections and payout history together — no orphaned ledger rows
 * pointing at a claim that no longer exists.
 */

function paypalOf(doc: StateDoc): PayPalState {
  if (!doc.paypal) doc.paypal = { connections: [], payouts: [] };
  if (!Array.isArray(doc.paypal.connections)) doc.paypal.connections = [];
  if (!Array.isArray(doc.paypal.payouts)) doc.paypal.payouts = [];
  return doc.paypal;
}

async function read<T>(ownerId: string, fn: (doc: StateDoc) => T): Promise<T> {
  const driver = await getDriver();
  const doc = (await driver.load(ownerId)) ?? emptyDoc({ id: ownerId, name: "", email: "" });
  return fn(doc);
}

async function write<T>(ownerId: string, fn: (doc: StateDoc) => T): Promise<T> {
  const driver = await getDriver();
  const doc = (await driver.load(ownerId)) ?? emptyDoc({ id: ownerId, name: "", email: "" });
  /* keep the claim clock honest before we persist anything */
  settle(doc);
  const result = fn(doc);
  await driver.save(ownerId, doc);
  return result;
}

/**
 * The connection for this browser.
 *
 * The sid lives in a cookie that is set while redirecting to paypal.com and read
 * again on the way back. Browsers that refuse to keep a cookie set on a
 * cross-site redirect would then look "connected" to nobody — the link exists,
 * the screen says it does not. So when there is no sid, the most recent link on
 * the account is the answer: one person, one PayPal account, one link.
 */
export async function getPayPalConnection(ownerId: string, sid: string | null): Promise<PayPalConnection | null> {
  return read(ownerId, (doc) => {
    const rows = paypalOf(doc).connections;
    if (sid) {
      const exact = rows.find((c) => c.sid === sid);
      if (exact) return exact;
    }
    const latest = [...rows].sort((a, b) => b.connectedAt.localeCompare(a.connectedAt))[0];
    return latest ?? null;
  });
}

export async function savePayPalConnection(ownerId: string, connection: PayPalConnection): Promise<void> {
  await write(ownerId, (doc) => {
    const state = paypalOf(doc);
    state.connections = state.connections.filter((c) => c.sid !== connection.sid);
    state.connections.push(connection);
    /* a household only ever needs a handful; keep the ten most recent */
    if (state.connections.length > 10) state.connections = state.connections.slice(-10);
  });
}

export async function clearPayPalConnection(ownerId: string, sid: string): Promise<void> {
  await write(ownerId, (doc) => {
    const state = paypalOf(doc);
    state.connections = state.connections.filter((c) => c.sid !== sid);
  });
}

export async function listPayPalPayouts(ownerId: string, claimId?: number): Promise<PayPalPayout[]> {
  return read(ownerId, (doc) => {
    const rows = paypalOf(doc).payouts;
    const scoped = claimId === undefined ? rows : rows.filter((p) => p.claimId === claimId);
    return [...scoped].sort((a, b) => b.id - a.id);
  });
}

export async function recordPayPalPayout(ownerId: string, row: Omit<PayPalPayout, "id">): Promise<PayPalPayout> {
  return write(ownerId, (doc) => {
    const state = paypalOf(doc);
    doc.seq += 1;
    const stored: PayPalPayout = { ...row, id: doc.seq };
    state.payouts.push(stored);
    return stored;
  });
}
