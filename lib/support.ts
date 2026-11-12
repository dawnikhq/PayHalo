import { getDriver, scanAllDocs } from "./storage";
import type { StateDoc } from "./model";

/**
 * Support requests.
 *
 * A ticket is its own document, under its own key (`support:<reference>`), so
 * two people writing at the same moment cannot overwrite each other and the
 * operator can list the whole inbox with the scan the release queue already
 * uses. That means the same code path works on every driver the product ships
 * with — Supabase in production, SQLite on a laptop, memory in a test — with no
 * migration to run and nothing to keep in step.
 */

export type SupportRole = "owner" | "keyholder" | "beneficiary" | "visitor";

export interface SupportTicket {
  /** The reference the person is given, e.g. PH-SUP-4KQ2M. */
  ref: string;
  userId: string | null;
  name: string;
  email: string;
  role: SupportRole;
  topic: string;
  message: string;
  /** What Halo said before they asked for a person, when they tried her first. */
  halo?: { question: string; answer: string; model?: string; topic?: string } | null;
  status: "open" | "closed";
  createdAt: string;
  /** The operator's answer, if one has been written. */
  reply?: { at: string; by: string; body: string } | null;
}

const PREFIX = "support:";

/** Crockford base32 — no I, L, O or U, so a reference cannot be misread aloud. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function reference(): string {
  let out = "";
  for (let i = 0; i < 5; i += 1) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `PH-SUP-${out}`;
}

function asDoc(ticket: SupportTicket): StateDoc {
  /* A ticket is not a plan. The driver is only asked to keep the bytes. */
  return { ticket } as unknown as StateDoc;
}

function fromDoc(doc: StateDoc): SupportTicket | null {
  const ticket = (doc as unknown as { ticket?: SupportTicket }).ticket;
  if (!ticket || typeof ticket.ref !== "string") return null;
  return ticket;
}

export interface NewTicket {
  userId: string | null;
  name: string;
  email: string;
  role: SupportRole;
  topic: string;
  message: string;
  halo?: SupportTicket["halo"];
}

export async function createTicket(input: NewTicket): Promise<SupportTicket> {
  const driver = await getDriver();
  const ticket: SupportTicket = {
    ref: reference(),
    userId: input.userId,
    name: input.name.trim().slice(0, 120),
    email: input.email.trim().slice(0, 200),
    role: input.role,
    topic: input.topic.trim().slice(0, 80) || "Something else",
    message: input.message.trim().slice(0, 4000),
    halo: input.halo ?? null,
    status: "open",
    createdAt: new Date().toISOString(),
    reply: null,
  };

  /* A collision is one in 33 million; still, one retry costs nothing. */
  try {
    await driver.save(PREFIX + ticket.ref, asDoc(ticket));
  } catch {
    ticket.ref = reference();
    await driver.save(PREFIX + ticket.ref, asDoc(ticket));
  }

  return ticket;
}

export async function listTickets(): Promise<SupportTicket[]> {
  const rows = await scanAllDocs();
  return rows
    .filter((row) => row.key.startsWith(PREFIX))
    .map((row) => fromDoc(row.doc))
    .filter((t): t is SupportTicket => Boolean(t))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTicket(ref: string): Promise<SupportTicket | null> {
  const driver = await getDriver();
  const doc = await driver.load(PREFIX + ref.toUpperCase());
  return doc ? fromDoc(doc) : null;
}

/** Everything this person has raised, newest first — account id first, then email. */
export async function ticketsFor(person: { userId?: string | null; email?: string | null }): Promise<SupportTicket[]> {
  const all = await listTickets();
  const email = person.email?.trim().toLowerCase();
  return all.filter(
    (ticket) =>
      (person.userId && ticket.userId === person.userId) || (email && ticket.email.toLowerCase() === email),
  );
}

export async function saveTicket(ticket: SupportTicket): Promise<void> {
  const driver = await getDriver();
  await driver.save(PREFIX + ticket.ref, asDoc(ticket));
}

export async function replyToTicket(ref: string, body: string, by: string): Promise<SupportTicket | null> {
  const ticket = await getTicket(ref);
  if (!ticket) return null;
  ticket.reply = { at: new Date().toISOString(), by, body: body.trim().slice(0, 4000) };
  ticket.status = "closed";
  await saveTicket(ticket);
  return ticket;
}

/** For the operator's line at the top of the inbox. */
export function ticketSummary(tickets: SupportTicket[]): { open: number; closed: number; today: number } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return {
    open: tickets.filter((t) => t.status === "open").length,
    closed: tickets.filter((t) => t.status === "closed").length,
    today: tickets.filter((t) => new Date(t.createdAt) >= start).length,
  };
}
