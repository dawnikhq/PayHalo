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
  /** The path a member walks, in order, with how many got that far. */
  funnel: { label: string; count: number }[];
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

  /*
   * One member may now hold several arrangements. A document key is the account
   * id, or that id with `#p2`, `#p3`… for later plans, so the CRM has to fold
   * them back into one row rather than counting a member once per plan.
   */
  const ownerOf = (key: string) => key.replace(/#p[0-9]+$/, "");
  const docsByOwner = new Map<string, StateDoc[]>();
  for (const { key, doc } of docs) {
    const owner = ownerOf(key);
    const list = docsByOwner.get(owner);
    if (list) list.push(doc);
    else docsByOwner.set(owner, [doc]);
  }

  const baseDoc = new Map<string, StateDoc>();
  for (const { key, doc } of docs) {
    const owner = ownerOf(key);
    if (key === owner) baseDoc.set(owner, doc);
    else if (!baseDoc.has(owner)) baseDoc.set(owner, doc);
  }

  const stepsIn = (doc: StateDoc) =>
    [
      doc.beneficiaries.some((b) => b.role === "primary"),
      doc.assets.length > 0,
      doc.beneficiaries.some((b) => b.role === "backup"),
      doc.beneficiaries.some((b) => b.role === "charity"),
      Boolean(doc.keyholder),
      Boolean(doc.plan.sealedAt),
    ].filter(Boolean).length;

  const customers: OperatorCustomer[] = accounts.map((a: Account) => {
    const mine = docsByOwner.get(a.id) ?? [];
    const doc = baseDoc.get(a.id);

    return {
      id: a.id,
      name: doc?.user.name || a.name || "Unnamed",
      email: a.email,
      confirmed: Boolean(a.emailVerifiedAt),
      joinedAt: a.createdAt ?? null,
      lastLoginAt: a.lastLoginAt ?? null,
      hasPlan: Boolean(doc),
      stepsDone: mine.reduce((best, d) => Math.max(best, stepsIn(d)), 0),
      assets: mine.reduce((sum, d) => sum + d.assets.length, 0),
      people: mine.reduce((sum, d) => sum + d.beneficiaries.length, 0),
      hasTrustedKey: mine.some((d) => Boolean(d.keyholder)),
      valueCents: mine.reduce((sum, d) => sum + vaultBalanceCents(d), 0),
      planStatus: planStatusOf(doc),
      handovers: mine.reduce((sum, d) => sum + d.claims.length, 0),
    };
  });

  // plans with no account row (a share-link visitor's document) still count
  const accountIds = new Set(accounts.map((a) => a.id));
  for (const { key, doc } of docs) {
    if (accountIds.has(ownerOf(key))) continue;
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

  const reached = {
    started: docs.filter((d) => d.doc.assets.length > 0 || d.doc.beneficiaries.length > 0).length,
    people: docs.filter((d) => d.doc.beneficiaries.length > 0).length,
    key: docs.filter((d) => Boolean(d.doc.keyholder)).length,
    sealed: docs.filter((d) => Boolean(d.doc.plan.sealedAt)).length,
    claims: docs.filter((d) => d.doc.claims.length > 0).length,
  };
  const funnel = [
    { label: "Account created", count: accounts.length },
    { label: "Plan started", count: reached.started },
    { label: "People named", count: reached.people },
    { label: "Trusted Key appointed", count: reached.key },
    { label: "Plan confirmed", count: reached.sealed },
    { label: "Handover filed", count: reached.claims },
  ];

  return {
    generatedAt: new Date().toISOString(),
    totals,
    funnel,
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

/** One row per filed claim that is still waiting on a human. */
export interface ClaimReviewRow {
  claimId: number;
  ownerName: string;
  ownerEmail: string;
  keyholderName: string;
  keyholderEmail: string;
  status: string;
  documentName: string;
  documentKind: string;
  confidence: number;
  verdict: string;
  summary: string;
  fields: { label: string; value: string }[];
  assets: { id: number; label: string; kind: string }[];
  note: string | null;
  filedAt: string;
  reviewEndsAt: string | null;
}

/**
 * The verification desk.
 *
 * A claim can only be decided on by a person: the automated pass in lib/certs.ts
 * says whether the bytes look like a death certificate, never whether someone
 * has died. This queue hands the operator the evidence, the checks that ran and
 * the assets the claim is about — and nothing that belongs to another plan.
 */
export async function claimQueue(): Promise<ClaimReviewRow[]> {
  const driver = await getDriver();
  let docs: { key: string; doc: StateDoc }[] = [];
  try {
    docs = driver.scan ? await driver.scan() : [];
  } catch {
    docs = [];
  }

  const rows: ClaimReviewRow[] = [];
  for (const { doc } of docs) {
    for (const claim of doc.claims) {
      if (claim.status !== "review") continue;
      let fields: { label: string; value: string }[] = [];
      let verdict = "review";
      let summary = "The document was read on the server.";
      try {
        const parsed = JSON.parse(claim.verification) as { verdict?: string; summary?: string };
        verdict = parsed.verdict ?? verdict;
        summary = parsed.summary ?? summary;
      } catch {
        /* keep the defaults */
      }
      try {
        const extracted = JSON.parse(claim.extracted) as { label?: string; value?: string }[];
        fields = (Array.isArray(extracted) ? extracted : [])
          .filter((f) => f && typeof f.label === "string")
          .slice(0, 8)
          .map((f) => ({ label: String(f.label), value: String(f.value ?? "") }));
      } catch {
        fields = [];
      }
      let assets: { id: number; label: string; kind: string }[] = [];
      try {
        const parsed = JSON.parse(claim.assetRefs ?? "[]") as { id: number; label: string; kind: string }[];
        assets = Array.isArray(parsed) ? parsed : [];
      } catch {
        assets = [];
      }

      rows.push({
        claimId: claim.id,
        ownerName: doc.user.name || "Unnamed",
        ownerEmail: doc.user.email || "—",
        keyholderName: doc.keyholder?.name ?? "Not appointed",
        keyholderEmail: doc.keyholder?.email ?? "—",
        status: claim.status,
        documentName: claim.documentName,
        documentKind: claim.documentKind,
        confidence: claim.confidence,
        verdict,
        summary,
        fields,
        assets,
        note: claim.note ?? null,
        filedAt: claim.initiatedAt,
        reviewEndsAt: claim.reviewEndsAt,
      });
    }
  }

  return rows.sort((a, b) => (a.filedAt < b.filedAt ? -1 : 1));
}
