import { listAccounts, type Account } from "./accounts";
import { getDriver } from "./storage";
import { vaultBalanceCents, type StateDoc } from "./model";
import { releaseQueue } from "./store";

/**
 * The operator's view of the business.
 *
 * Read-only, aggregated, and deliberately blind to the one thing that must stay
 * dark: no vault key, no share crypto, no evidence file. It is a customer desk,
 * not a back door into someone's plan.
 */

export interface OperatorCustomer {
  id: string;
  name: string;
  email: string;
  confirmed: boolean;
  joinedAt: string | null;
  lastLoginAt: string | null;
  hasPlan: boolean;
  stepsDone: number;
  assets: number;
  people: number;
  hasTrustedKey: boolean;
  valueCents: number;
  planStatus: string;
  handovers: number;
}

export interface OperatorEvent {
  at: string;
  owner: string;
  title: string;
  body: string;
  type: string;
}

export interface OperatorOverview {
  generatedAt: string;
  totals: {
    accounts: number;
    confirmed: number;
    unconfirmed: number;
    withPlan: number;
    confirmedPlans: number;
    withTrustedKey: number;
    assets: number;
    people: number;
    valueCents: number;
    handoversOpen: number;
    handoversWindow: number;
    released: number;
  };
  signups: { label: string; count: number }[];
  statuses: { label: string; count: number; tone: string }[];
  customers: OperatorCustomer[];
  events: OperatorEvent[];
  storage: string;
}

function planStatusOf(doc: StateDoc | undefined): string {
  if (!doc) return "No plan yet";
  if (doc.distributions.length > 0) return "Handed over";
  const active = doc.claims.find((c) => c.status === "window");
  if (active) return "In safety window";
  const review = doc.claims.find((c) => c.status === "review");
  if (review) return "Under review";
  if (doc.plan.sealedAt) return "Confirmed";
  if (doc.assets.length > 0 || doc.beneficiaries.length > 0) return "In progress";
  return "Just joined";
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function operatorOverview(): Promise<OperatorOverview> {
  const driver = await getDriver();
  let docs: { key: string; doc: StateDoc }[] = [];
  try {
    docs = driver.scan ? await driver.scan() : [];
  } catch {
    docs = [];
  }

  const [accounts, queue] = await Promise.all([listAccounts(), releaseQueue().catch(() => [])]);
  const byOwner = new Map<string, StateDoc>(docs.map((d) => [d.key, d.doc]));

  const customers: OperatorCustomer[] = accounts.map((a: Account) => {
    const doc = byOwner.get(a.id);
    const stepsDone = doc
      ? [
          doc.beneficiaries.some((b) => b.role === "primary"),
          doc.assets.length > 0,
          doc.beneficiaries.some((b) => b.role === "backup"),
          doc.beneficiaries.some((b) => b.role === "charity"),
          Boolean(doc.keyholder),
          Boolean(doc.plan.sealedAt),
        ].filter(Boolean).length
      : 0;

    return {
      id: a.id,
      name: doc?.user.name || a.name || "Unnamed",
      email: a.email,
      confirmed: Boolean(a.emailVerifiedAt),
      joinedAt: a.createdAt ?? null,
      lastLoginAt: a.lastLoginAt ?? null,
      hasPlan: Boolean(doc),
      stepsDone,
      assets: doc?.assets.length ?? 0,
      people: doc?.beneficiaries.length ?? 0,
      hasTrustedKey: Boolean(doc?.keyholder),
      valueCents: doc ? vaultBalanceCents(doc) : 0,
      planStatus: planStatusOf(doc),
      handovers: doc?.claims.length ?? 0,
    };
  });

  // plans with no account row (a share-link visitor's document) still count
  for (const { key, doc } of docs) {
    if (accounts.some((a) => a.id === key)) continue;
    customers.push({
      id: key,
      name: doc.user.name || "Unnamed",
      email: doc.user.email || "—",
      confirmed: true,
      joinedAt: null,
      lastLoginAt: null,
      hasPlan: true,
      stepsDone: 0,
      assets: doc.assets.length,
      people: doc.beneficiaries.length,
      hasTrustedKey: Boolean(doc.keyholder),
      valueCents: vaultBalanceCents(doc),
      planStatus: planStatusOf(doc),
      handovers: doc.claims.length,
    });
  }

  const totals = {
    accounts: accounts.length,
    confirmed: accounts.filter((a) => a.emailVerifiedAt).length,
    unconfirmed: accounts.filter((a) => !a.emailVerifiedAt).length,
    withPlan: docs.filter((d) => d.doc.assets.length > 0 || d.doc.beneficiaries.length > 0).length,
    confirmedPlans: docs.filter((d) => Boolean(d.doc.plan.sealedAt)).length,
    withTrustedKey: docs.filter((d) => Boolean(d.doc.keyholder)).length,
    assets: docs.reduce((sum, d) => sum + d.doc.assets.length, 0),
    people: docs.reduce((sum, d) => sum + d.doc.beneficiaries.length, 0),
    valueCents: docs.reduce((sum, d) => sum + vaultBalanceCents(d.doc), 0),
    handoversOpen: queue.length,
    handoversWindow: docs.filter((d) => d.doc.claims.some((c) => c.status === "window")).length,
    released: docs.reduce((sum, d) => sum + d.doc.distributions.length, 0),
  };

  // last eight weeks of sign-ups, oldest first
  const weeks: { label: string; count: number }[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i -= 1) {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - i * 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    weeks.push({
      label: `${start.getUTCDate()} ${MONTHS[start.getUTCMonth()]}`,
      count: accounts.filter((a) => {
        const at = a.createdAt ? Date.parse(a.createdAt) : NaN;
        return Number.isFinite(at) && at >= start.getTime() && at < end.getTime();
      }).length,
    });
  }

  const statusCounts = new Map<string, number>();
  for (const c of customers) statusCounts.set(c.planStatus, (statusCounts.get(c.planStatus) ?? 0) + 1);
  const tone: Record<string, string> = {
    "Handed over": "mint",
    "In safety window": "lime",
    "Under review": "sand",
    Confirmed: "mint",
    "In progress": "sand",
    "Just joined": "neutral",
    "No plan yet": "neutral",
  };
  const statuses = [...statusCounts.entries()]
    .map(([label, count]) => ({ label, count, tone: tone[label] ?? "neutral" }))
    .sort((a, b) => b.count - a.count);

  const events: OperatorEvent[] = [];
  for (const { doc } of docs) {
    for (const e of doc.events ?? []) {
      events.push({
        at: e.createdAt,
        owner: doc.user.name || doc.user.email || "A member",
        title: e.title,
        body: e.body,
        type: e.type,
      });
    }
  }
  events.sort((a, b) => (a.at < b.at ? 1 : -1));

  return {
    generatedAt: new Date().toISOString(),
    totals,
    signups: weeks,
    statuses,
    customers: customers.sort((a, b) => (a.joinedAt ?? "") < (b.joinedAt ?? "") ? 1 : -1),
    events: events.slice(0, 12),
    storage: driver.label,
  };
}

/** Kept for the queue component, which wants only rows. */
export type { ReleaseQueueRow } from "./store";
export { isoDay };
