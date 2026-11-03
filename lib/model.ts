import { allocate, totalOf } from "./engine";
import { mockExtract } from "./ocr";
import type {
  Asset,
  Beneficiary,
  Claim,
  Distribution,
  EventRow,
  Keyholder,
  Plan,
  Role,
  Snapshot,
  User,
} from "./types";

export const SAFETY_WINDOW_DAYS = 14;

/**
 * The whole prototype state is a single JSON document.
 *
 * That is a deliberate choice: it keeps the domain logic identical across the
 * SQLite dev store, the in-memory serverless store and the KV store, and it
 * makes the "reset demo" action trivial.
 */
export interface StateDoc {
  user: User;
  plan: Plan;
  assets: Asset[];
  beneficiaries: Beneficiary[];
  keyholder: Keyholder | null;
  claims: Claim[];
  distributions: Distribution[];
  events: EventRow[];
  seq: number;
}

const now = () => new Date().toISOString();
const windowEnd = (days = SAFETY_WINDOW_DAYS) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

export function totalCents(doc: StateDoc): number {
  return totalOf(doc.assets);
}

export function latestClaim(doc: StateDoc): Claim | null {
  return doc.claims.length ? doc.claims[doc.claims.length - 1] : null;
}

export function orderedBeneficiaries(doc: StateDoc): Beneficiary[] {
  const rank: Record<Role, number> = { primary: 0, backup: 1, charity: 2 };
  return [...doc.beneficiaries].sort(
    (a, b) => rank[a.role] - rank[b.role] || a.sort - b.sort || a.id - b.id,
  );
}

export function snapshotOf(doc: StateDoc): Omit<Snapshot, "storage"> {
  const claim = latestClaim(doc);
  const total = totalCents(doc);

  return {
    user: doc.user,
    plan: doc.plan,
    assets: doc.assets,
    beneficiaries: orderedBeneficiaries(doc),
    keyholder: doc.keyholder,
    claim,
    distributions: claim
      ? doc.distributions
          .filter((d) => d.claimId === claim.id)
          .map((d) => {
            const b = doc.beneficiaries.find((x) => x.id === d.beneficiaryId);
            return { ...d, name: b?.name ?? "Unknown", role: (b?.role ?? "primary") as Role };
          })
          .sort((a, b) => b.amountCents - a.amountCents)
      : [],
    events: [...doc.events].reverse().slice(0, 14),
    totalCents: total,
    secondsToWindowEnd:
      claim && claim.status === "window" && claim.windowEndsAt
        ? Math.max(0, Math.floor((new Date(claim.windowEndsAt).getTime() - Date.now()) / 1000))
        : null,
  };
}

/* ------------------------------------------------------------------ seed -- */

export function seedDoc(): StateDoc {
  let id = 0;
  const nid = () => ++id;
  const stamp = now();

  const userId = nid();
  const planId = nid();
  const sealed = new Date(Date.now() - 1000 * 60 * 60 * 24 * 46).toISOString();

  const beneficiaries: Beneficiary[] = [
    {
      id: nid(),
      userId,
      name: "Chidi Okafor",
      email: "chidi@hack1.demo",
      relationship: "Brother",
      role: "primary",
      share: 100,
      sort: 0,
      available: 1,
      note: "You covered me when I had nothing. Use this to finish the house in Enugu — and please take the studio to Lagos. Don't be scared to spend some of it on yourself.",
    },
    {
      id: nid(),
      userId,
      name: "Ngozi Okafor",
      email: "ngozi@hack1.demo",
      relationship: "Mother",
      role: "backup",
      share: 60,
      sort: 1,
      available: 1,
      note: "Mama, this is for you first. The rest goes to the education fund we talked about.",
    },
    {
      id: nid(),
      userId,
      name: "Tunde Bello",
      email: "tunde@hack1.demo",
      relationship: "Cousin",
      role: "backup",
      share: 40,
      sort: 2,
      available: 1,
      note: "You always said I should teach you crypto. Last lesson: hold it, and don't panic-sell when the market gets loud.",
    },
    {
      id: nid(),
      userId,
      name: "The Girls' Code Fund",
      email: "hello@girlscode.fund",
      relationship: "Registered nonprofit",
      role: "charity",
      share: 100,
      sort: 90,
      available: 1,
      note: "If there's no one left to carry this, let it go to the people who taught me to build. Fund the next girl who has nothing but a laptop.",
    },
  ];

  const assets: Asset[] = [
    {
      id: nid(),
      userId,
      kind: "paypal",
      label: "PayPal Business",
      provider: "PayPal",
      balanceCents: 842050,
      detail: "2 currencies · 41 pending payouts",
      connected: 1,
    },
    {
      id: nid(),
      userId,
      kind: "crypto",
      label: "Self-custody wallet",
      provider: "Ethereum + Bitcoin",
      balanceCents: 561020,
      detail: "0.0842 BTC · 3.10 ETH",
      connected: 1,
    },
    {
      id: nid(),
      userId,
      kind: "business",
      label: "Ada's Studio (storefront)",
      provider: "Gumroad + Stripe",
      balanceCents: 1230000,
      detail: "$4,100 MRR · 612 customers",
      connected: 1,
    },
  ];

  const keyholder: Keyholder = {
    id: nid(),
    userId,
    name: "Emeka Nwosu",
    email: "emeka@hack1.demo",
    relationship: "Best friend",
    accessCode: "KEY-4721",
  };

  return {
    user: { id: userId, name: "Ada Okafor", email: "ada@hack1.demo" },
    plan: { id: planId, userId, status: "active", sealedAt: sealed, updatedAt: stamp },
    assets,
    beneficiaries,
    keyholder,
    claims: [],
    distributions: [],
    events: [
      {
        id: nid(),
        planId,
        type: "plan.sealed",
        title: "Plan sealed",
        body: "Ada sealed a plan covering 3 connected accounts and 4 recipients.",
        createdAt: sealed,
      },
    ],
    seq: id,
  };
}

/* ------------------------------------------------------------- utilities -- */

function addEvent(
  doc: StateDoc,
  type: string,
  title: string,
  body = "",
  createdAt = now(),
): void {
  doc.seq += 1;
  doc.events.push({ id: doc.seq, planId: doc.plan.id, type, title, body, createdAt });
}

export function allocateFor(doc: StateDoc) {
  return allocate(orderedBeneficiaries(doc), totalCents(doc));
}

/**
 * If a verified claim's safety window has elapsed, run the engine and close
 * the plan. Returns true when the document changed (so it can be persisted).
 */
export function settle(doc: StateDoc): boolean {
  const claim = latestClaim(doc);
  if (!claim || claim.status !== "window" || !claim.windowEndsAt) return false;
  if (new Date(claim.windowEndsAt).getTime() > Date.now()) return false;

  const total = totalCents(doc);
  const allocations = allocate(orderedBeneficiaries(doc), total);
  const stamp = now();

  doc.distributions = doc.distributions.filter((d) => d.claimId !== claim.id);
  for (const a of allocations) {
    doc.seq += 1;
    doc.distributions.push({
      id: doc.seq,
      claimId: claim.id,
      beneficiaryId: a.beneficiaryId,
      amountCents: a.amountCents,
      share: a.share,
      status: "released",
      createdAt: stamp,
    });
  }

  claim.status = "distributed";
  claim.distributedAt = stamp;
  doc.plan.status = "distributed";
  doc.plan.updatedAt = stamp;

  addEvent(
    doc,
    "distribution.executed",
    "Handover executed",
    `${allocations.length} recipient${allocations.length === 1 ? "" : "s"} funded from ${doc.beneficiaries.length} instructions.`,
    stamp,
  );
  return true;
}

/* ------------------------------------------------------------- mutations -- */

export interface PlanInput {
  name: string;
  email: string;
  assets: { kind: string; label: string; provider: string; balanceCents: number; detail: string }[];
  primary: { name: string; email: string; relationship: string; note: string };
  backups: { name: string; email: string; relationship: string; share: number; note: string }[];
  charity: { name: string; email: string; note: string };
  keyholder: { name: string; email: string; relationship: string; accessCode: string };
}

export function applyPlan(input: PlanInput): StateDoc {
  const doc = seedDoc(); // reuse the shaping, then overwrite below
  let id = 0;
  const nid = () => ++id;
  const stamp = now();

  const userId = nid();
  const planId = nid();

  const assets: Asset[] = input.assets.map((a) => ({
    id: nid(),
    userId,
    kind: a.kind as Asset["kind"],
    label: a.label,
    provider: a.provider,
    balanceCents: a.balanceCents,
    detail: a.detail,
    connected: 1,
  }));

  const beneficiaries: Beneficiary[] = [];
  beneficiaries.push({
    id: nid(),
    userId,
    name: input.primary.name,
    email: input.primary.email,
    relationship: input.primary.relationship,
    role: "primary",
    share: 100,
    sort: 0,
    available: 1,
    note: input.primary.note,
  });
  input.backups.forEach((b, i) => {
    beneficiaries.push({
      id: nid(),
      userId,
      name: b.name,
      email: b.email,
      relationship: b.relationship,
      role: "backup",
      share: b.share,
      sort: i + 1,
      available: 1,
      note: b.note,
    });
  });
  beneficiaries.push({
    id: nid(),
    userId,
    name: input.charity.name,
    email: input.charity.email,
    relationship: "Charity",
    role: "charity",
    share: 100,
    sort: 90,
    available: 1,
    note: input.charity.note,
  });

  const keyholder: Keyholder = {
    id: nid(),
    userId,
    name: input.keyholder.name,
    email: input.keyholder.email,
    relationship: input.keyholder.relationship,
    accessCode: input.keyholder.accessCode,
  };

  doc.user = { id: userId, name: input.name, email: input.email };
  doc.plan = { id: planId, userId, status: "active", sealedAt: stamp, updatedAt: stamp };
  doc.assets = assets;
  doc.beneficiaries = beneficiaries;
  doc.keyholder = keyholder;
  doc.claims = [];
  doc.distributions = [];
  doc.events = [];
  doc.seq = id;

  addEvent(
    doc,
    "plan.sealed",
    "Plan sealed",
    `${input.name} sealed a plan covering ${assets.length} accounts and ${beneficiaries.length} recipients.`,
    stamp,
  );
  return doc;
}

export function submitClaim(
  doc: StateDoc,
  accessCode: string,
  documentName: string,
): { ok: boolean; error?: string } {
  if (!doc.keyholder) return { ok: false, error: "No keyholder on file." };
  if (accessCode.trim().toUpperCase() !== doc.keyholder.accessCode.toUpperCase()) {
    return { ok: false, error: "That access code doesn't match the keyholder on file." };
  }
  const existing = latestClaim(doc);
  if (existing && existing.status !== "cancelled") {
    return { ok: false, error: "A handover is already in progress." };
  }

  const ocr = mockExtract(documentName || "death-certificate.pdf", doc.user.name);
  doc.seq += 1;
  const claim: Claim = {
    id: doc.seq,
    planId: doc.plan.id,
    keyholderId: doc.keyholder.id,
    status: "verifying",
    documentName: ocr.documentName,
    extracted: JSON.stringify(ocr.fields),
    confidence: ocr.confidence,
    initiatedAt: now(),
    verifiedAt: null,
    windowEndsAt: null,
    distributedAt: null,
  };
  doc.claims.push(claim);

  addEvent(
    doc,
    "claim.submitted",
    "Keyholder submitted a certificate",
    `${doc.keyholder.name} uploaded ${ocr.documentName}. ${Math.round(ocr.confidence * 100)}% extraction confidence. Claim #${claim.id}.`,
  );
  return { ok: true };
}

export function verifyClaim(doc: StateDoc): { ok: boolean; error?: string } {
  const claim = latestClaim(doc);
  if (!claim) return { ok: false, error: "No claim submitted." };
  if (claim.status !== "verifying") return { ok: false, error: "Claim is not awaiting verification." };

  claim.status = "window";
  claim.verifiedAt = now();
  claim.windowEndsAt = windowEnd();
  doc.plan.status = "claiming";
  doc.plan.updatedAt = now();

  addEvent(
    doc,
    "claim.verified",
    "Certificate verified",
    `Owner notified. ${SAFETY_WINDOW_DAYS}-day safety window opened — no transfer can happen before it closes.`,
  );
  return { ok: true };
}

export function cancelClaim(doc: StateDoc): { ok: boolean; error?: string } {
  const claim = latestClaim(doc);
  if (!claim || claim.status !== "window") {
    return { ok: false, error: "There is no open safety window." };
  }
  claim.status = "cancelled";
  doc.plan.status = "active";
  doc.plan.updatedAt = now();
  addEvent(
    doc,
    "window.cancelled",
    "Owner stopped the handover",
    "The owner responded inside the safety window. Nothing was transferred.",
  );
  return { ok: true };
}

export function fastForward(doc: StateDoc): { ok: boolean; error?: string } {
  const claim = latestClaim(doc);
  if (!claim || claim.status !== "window") {
    return { ok: false, error: "There is no open safety window." };
  }
  claim.windowEndsAt = now();
  addEvent(
    doc,
    "window.elapsed",
    "Safety window elapsed",
    `${SAFETY_WINDOW_DAYS} days passed with no response from the owner. Handover due.`,
  );
  settle(doc);
  return { ok: true };
}

export function setAvailability(doc: StateDoc, id: number, available: boolean): { ok: boolean } {
  const ben = doc.beneficiaries.find((b) => b.id === id);
  if (ben) {
    ben.available = available ? 1 : 0;
    addEvent(
      doc,
      "beneficiary.availability",
      available ? `${ben.name} reachable again` : `${ben.name} marked unreachable`,
      available
        ? "The engine can route assets to this recipient again."
        : "The engine will fall through to the next instruction if a handover runs.",
    );
  }
  return { ok: true };
}
