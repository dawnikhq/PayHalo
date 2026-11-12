import { getDriver, scanAllDocs } from "./storage";
import type { StateDoc } from "./model";

/**
 * The PayHalo balance — demo money, kept honestly.
 *
 * Every account starts with $20,000 that is not real, and can send it to
 * another PayHalo handle. Nothing here touches PayPal: the PayPal connection
 * is a separate, real (sandbox) link, and the two are never mixed, because a
 * balance that is pretend must never look like one that is not.
 *
 * A wallet is one document under `wallet:<account id>`, so a transfer never
 * rewrites a document another request is writing, and the handle directory is
 * a scan of the same keys. The two writes of a transfer are not one
 * transaction — this is a hackathon's worth of ledger, not a bank's — but both
 * sides are always written with the same amount, and every entry names its
 * counterparty, so the arithmetic is checkable after the fact.
 */

const PREFIX = "wallet:";

/** $20,000, in cents. Demo money, granted once per account. */
export const SEED_CENTS = 2_000_000;

/** The most a single transfer may move, in cents. */
export const MAX_TRANSFER_CENTS = 2_000_000;

export interface WalletEntry {
  id: string;
  at: string;
  kind: "seed" | "in" | "out" | "adjust";
  amountCents: number;
  /** The other side's handle, when there is one. */
  handle?: string;
  name?: string;
  note?: string;
  ref?: string;
}

/** The owner fields a wallet needs: who it belongs to, and what to call them. */
export type WalletOwner = { id: string; email: string; name?: string | null };

export interface Wallet {
  userId: string;
  handle: string;
  name: string;
  email: string;
  balanceCents: number;
  seededAt: string;
  entries: WalletEntry[];
  /** Set when the person links a sandbox PayPal account, for the receipt. */
  paypal?: { email: string; connectedAt: string } | null;
}

function asDoc(wallet: Wallet): StateDoc {
  return { wallet } as unknown as StateDoc;
}

function fromDoc(doc: StateDoc): Wallet | null {
  const wallet = (doc as unknown as { wallet?: Wallet }).wallet;
  if (!wallet || typeof wallet.userId !== "string" || typeof wallet.balanceCents !== "number") return null;
  if (!Array.isArray(wallet.entries)) wallet.entries = [];
  return wallet;
}

/** `ada.lovelace@example.com` → `adalovelace`; readable, lowercase, no spaces. */
export function handleBase(account: { email: string; name?: string | null }): string {
  const local = (account.email.split("@")[0] ?? "").toLowerCase();
  const cleaned = local.replace(/[^a-z0-9]/g, "");
  return (cleaned || "halo").slice(0, 16);
}

function suffix(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  return String(hash).padStart(2, "0").slice(-2);
}

export async function listWallets(): Promise<Wallet[]> {
  const rows = await scanAllDocs();
  return rows
    .filter((row) => row.key.startsWith(PREFIX))
    .map((row) => fromDoc(row.doc))
    .filter((w): w is Wallet => Boolean(w));
}

async function save(wallet: Wallet): Promise<void> {
  const driver = await getDriver();
  await driver.save(PREFIX + wallet.userId, asDoc(wallet));
}

function entryId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * The wallet for this account, created with its seed the first time it is
 * asked for. Idempotent: calling it twice never seeds twice.
 */
export async function ensureWallet(account: WalletOwner): Promise<Wallet> {
  const driver = await getDriver();
  const existing = await driver.load(PREFIX + account.id);
  const found = existing ? fromDoc(existing) : null;
  if (found) {
    /* Keep the display details fresh without touching the money. */
    const next = { ...found, name: account.name ?? found.name, email: account.email };
    if (next.name !== found.name || next.email !== found.email) await save(next);
    return next;
  }

  const taken = new Set((await listWallets()).map((w) => w.handle.toLowerCase()));
  let handle = handleBase(account);
  if (taken.has(handle)) handle = `${handle.slice(0, 13)}${suffix(account.id)}`;
  let guard = 0;
  while (taken.has(handle) && guard < 20) {
    handle = `${handleBase(account).slice(0, 12)}${Math.floor(Math.random() * 900 + 100)}`;
    guard += 1;
  }

  const wallet: Wallet = {
    userId: account.id,
    handle,
    name: account.name?.trim() || handle,
    email: account.email,
    balanceCents: SEED_CENTS,
    seededAt: new Date().toISOString(),
    entries: [
      {
        id: entryId(),
        at: new Date().toISOString(),
        kind: "seed",
        amountCents: SEED_CENTS,
        note: "Starting balance — demo money, not real funds.",
        ref: "SEED",
      },
    ],
    paypal: null,
  };

  await save(wallet);
  return wallet;
}

export async function getWallet(userId: string): Promise<Wallet | null> {
  const driver = await getDriver();
  const doc = await driver.load(PREFIX + userId);
  return doc ? fromDoc(doc) : null;
}

export async function findByHandle(handle: string): Promise<Wallet | null> {
  const wanted = handle.trim().replace(/^@/, "").toLowerCase();
  if (!wanted) return null;
  const all = await listWallets();
  return all.find((w) => w.handle.toLowerCase() === wanted) ?? null;
}

export type TransferResult =
  | { ok: true; wallet: Wallet; to: { handle: string; name: string } }
  | { ok: false; error: string };

/** Send demo money to another handle. Amounts are cents; the note is optional. */
export async function transferDemoMoney(
  account: WalletOwner,
  toHandle: string,
  cents: number,
  note: string,
): Promise<TransferResult> {
  if (!Number.isInteger(cents) || cents < 100) {
    return { ok: false, error: "Send at least $1.00." };
  }
  if (cents > MAX_TRANSFER_CENTS) {
    return { ok: false, error: "A single transfer is capped at $20,000.00." };
  }

  const sender = await ensureWallet(account);
  if (cents > sender.balanceCents) {
    return { ok: false, error: "That is more than this balance holds." };
  }

  const recipient = await findByHandle(toHandle);
  if (!recipient) return { ok: false, error: "No PayHalo handle matches that." };
  if (recipient.userId === sender.userId) return { ok: false, error: "That is your own handle." };
  if (recipient.handle.toLowerCase() === sender.handle.toLowerCase()) {
    return { ok: false, error: "That is your own handle." };
  }

  const at = new Date().toISOString();
  const ref = `PH-TRF-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const cleanNote = note.trim().slice(0, 120);

  const credited: Wallet = {
    ...recipient,
    balanceCents: recipient.balanceCents + cents,
    entries: [
      {
        id: entryId(),
        at,
        kind: "in" as const,
        amountCents: cents,
        handle: sender.handle,
        name: sender.name,
        note: cleanNote || `From ${sender.handle}`,
        ref,
      },
      ...recipient.entries,
    ].slice(0, 60),
  };

  const debited: Wallet = {
    ...sender,
    balanceCents: sender.balanceCents - cents,
    entries: [
      {
        id: entryId(),
        at,
        kind: "out" as const,
        amountCents: cents,
        handle: recipient.handle,
        name: recipient.name,
        note: cleanNote || `To ${recipient.handle}`,
        ref,
      },
      ...sender.entries,
    ].slice(0, 60),
  };

  /* Credit first: if the second write fails, the money is doubled nowhere and
     visible in one ledger with a matching reference, rather than lost. */
  await save(credited);
  await save(debited);

  return { ok: true, wallet: debited, to: { handle: recipient.handle, name: recipient.name } };
}

/** Other handles, for the demo directory on the money page. Never balances. */
export async function directory(excludeUserId: string): Promise<{ handle: string; name: string }[]> {
  const all = await listWallets();
  return all
    .filter((w) => w.userId !== excludeUserId)
    .map((w) => ({ handle: w.handle, name: w.name }))
    .sort((a, b) => a.handle.localeCompare(b.handle))
    .slice(0, 24);
}

export function walletSummary(wallet: Wallet): { inCents: number; outCents: number; count: number } {
  let inCents = 0;
  let outCents = 0;
  for (const entry of wallet.entries) {
    if (entry.kind === "in") inCents += entry.amountCents;
    if (entry.kind === "out") outCents += entry.amountCents;
  }
  return { inCents, outCents, count: wallet.entries.length };
}
