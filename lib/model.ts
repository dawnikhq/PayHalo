import { allocate, totalOf } from "./engine";
import { money } from "./format";
import type { StoredReport } from "./certs";
import type {
  Vault,
  ReleaseRequest,
  Asset,
  AssetKind,
  Beneficiary,
  ClaimStatus,
  DocumentRow,
  Claim,
  Distribution,
  EventRow,
  Keyholder,
  Plan,
  PlanStatus,
  PayPalState,
  PlanStep,
  Pot,
  MoneyMove,
  Role,
  Snapshot,
  User,
} from "./types";

export const SAFETY_WINDOW_DAYS = 14;

/**
 * Hours between a keyholder filing a certificate and the owner being told
 * about it. The registry check happens inside this window; a claim that hasn't
 * cleared it must never surface to the owner.
 */
export const REVIEW_HOURS = 72;

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
  documents: DocumentRow[];
  events: EventRow[];
  seq: number;
  /** The vault this plan's money sits in, once the owner starts the plan. */
  vault?: Vault | null;
  /** Death-documentation release requests and the operator's decisions. */
  releaseRequests?: ReleaseRequest[];
  /** Money the owner has moved into PayHalo, and what it was set aside for. */
  stashCents?: number;
  pots?: Pot[];
  moves?: MoneyMove[];
  /**
   * PayPal connections and payout attempts. Optional so documents written
   * before the integration existed keep loading.
   */
  paypal?: PayPalState;
}

const now = () => new Date().toISOString();

/**
 * A brand-new account: no assets, no people, no keyholder, nothing sealed.
 * The app is empty until the owner puts something in it.
 */
export function emptyDoc(user: { id: string; name: string; email: string }): StateDoc {
  const stamp = now();
  return {
    user: { id: 1, name: user.name || "New account", email: user.email || "" },
    plan: { id: 2, userId: 1, status: "draft", sealedAt: null, updatedAt: stamp, name: "My plan", createdAt: stamp },
    assets: [],
    beneficiaries: [],
    keyholder: null,
    claims: [],
    distributions: [],
    documents: [],
    events: [],
    seq: 3,
    stashCents: 0,
    pots: [],
    moves: [],
    vault: null,
    releaseRequests: [],
  };
}

export function totalCents(doc: StateDoc): number {
  return totalOf(doc.assets);
}

export function latestClaim(doc: StateDoc): Claim | null {
  return doc.claims.length ? doc.claims[doc.claims.length - 1] : null;
}

/** The five checklist items shown on My Plan and the dashboard progress card. */
/**
 * Six steps, in the order a person actually thinks about them. The vault is not
 * one of them: it is what happens once all six are done.
 */
export function planSteps(doc: StateDoc): PlanStep[] {
  const has = (role: Role) => doc.beneficiaries.some((b) => b.role === role);
  return [
    { key: "first_choice", label: "Primary beneficiaries", done: has("primary") },
    { key: "assets", label: "What you own", done: doc.assets.length > 0 },
    { key: "backups", label: "Backup beneficiaries", done: has("backup") },
    { key: "charity", label: "Final beneficiary", done: has("charity") },
    { key: "keyholder", label: "Trusted Key", done: Boolean(doc.keyholder) },
    { key: "review", label: "Review & confirm", done: Boolean(doc.plan.sealedAt) },
  ];
}

export function orderedBeneficiaries(doc: StateDoc): Beneficiary[] {
  const rank: Record<Role, number> = { primary: 0, backup: 1, charity: 2 };
  return [...doc.beneficiaries].sort(
    (a, b) => rank[a.role] - rank[b.role] || a.sort - b.sort || a.id - b.id,
  );
}

export type Audience = "owner" | "keyholder" | "beneficiary";

export function snapshotOf(
  doc: StateDoc,
  audience: Audience = "owner",
): Omit<Snapshot, "storage"> {
  const claim = latestClaim(doc);
  const total = totalCents(doc);

  return {
    user: doc.user,
    plan: doc.plan,
    assets: doc.assets,
    documents: doc.documents ?? [],
    steps: planSteps(doc),
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
    stashCents: doc.stashCents ?? 0,
    pots: doc.pots ?? [],
    vault: doc.vault ?? null,
    releaseRequests: [...(doc.releaseRequests ?? [])].sort((a, b) => b.id - a.id),
    moves: [...(doc.moves ?? [])].reverse().slice(0, 20),
    events: [...doc.events]
      // `ownerVisible` was added with the 72-hour gate; older rows have no
      // flag and were always owner-visible.
      .filter((e) => (audience === "owner" ? e.ownerVisible !== 0 : true))
      .reverse()
      .slice(0, 14),
    totalCents: total,
    secondsToReviewEnd:
      claim && claim.status === "review" && claim.reviewEndsAt
        ? Math.max(0, Math.floor((new Date(claim.reviewEndsAt).getTime() - Date.now()) / 1000))
        : null,
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
      url: "paypal.com/business",
      handoverNote: "Release the business balance to Chidi. Close the pending payouts first.",
      accessNote: "Recovery goes through PayPal's deceased-account process. Never share the password.",
      reviewed: 1,
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
      url: "wallet address on file",
      handoverNote: "Instructions live in Documents. The seed phrase is written down offline, not here.",
      accessNote: "Follow the recovery instructions stored in Documents. Never enter a seed phrase into a website.",
      reviewed: 0,
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
      url: "adasstudio.demo",
      handoverNote: "Storefront ownership, customer relationships and operating documentation.",
      accessNote: "Use the business recovery guide in Documents. Never share live passwords.",
      monthlyCents: 410000,
      customers: 612,
      reviewed: 0,
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
    user: {
      id: userId,
      name: "Ada Okafor",
      email: "ada@hack1.demo",
      phone: "+234 800 000 0000",
      timezone: "West Africa Time · UTC+1",
    },
    plan: { id: planId, userId, status: "active", sealedAt: sealed, updatedAt: stamp },
    assets,
    beneficiaries,
    keyholder,
    claims: [],
    distributions: [],
    documents: [
      {
        id: nid(),
        userId,
        name: "Business recovery guide",
        kind: "PDF",
        sizeKb: 1843,
        relatedTo: "Ada's Studio",
        access: "beneficiaries",
        updatedAt: stamp,
        createdAt: sealed,
      },
      {
        id: nid(),
        userId,
        name: "Wallet recovery instructions",
        kind: "PDF",
        sizeKb: 840,
        relatedTo: "Self-custody wallet",
        access: "owner",
        updatedAt: stamp,
        createdAt: sealed,
      },
      {
        id: nid(),
        userId,
        name: "Personal letter for Chidi",
        kind: "PDF",
        sizeKb: 220,
        relatedTo: "My Plan",
        access: "beneficiaries",
        updatedAt: stamp,
        createdAt: sealed,
      },
    ],
    events: [
      {
        id: nid(),
        planId,
        type: "plan.sealed",
        title: "Plan sealed",
        body: "Ada sealed a plan covering 3 connected accounts and 4 recipients.",
        createdAt: sealed,
        ownerVisible: 1,
      },
    ],
    seq: id,
  };
}

/* ------------------------------------------------------------- utilities -- */

export function recordEvent(
  doc: StateDoc,
  type: string,
  title: string,
  body = "",
  createdAt = now(),
  ownerVisible = 1,
): void {
  doc.seq += 1;
  doc.events.push({ id: doc.seq, planId: doc.plan.id, type, title, body, createdAt, ownerVisible });
}

const addEvent = recordEvent;

export function allocateFor(doc: StateDoc) {
  return allocate(orderedBeneficiaries(doc), totalCents(doc));
}

/**
 * Moves a claim through time. Two gates, in order:
 *
 *   1. the 72-hour registry check  → owner notified, 14-day safety window opens
 *   2. the safety window           → the engine releases the estate
 *
 * Returns true when the document changed (so it can be persisted).
 */
export function settle(doc: StateDoc): boolean {
  const claim = latestClaim(doc);
  if (!claim) return false;
  let changed = false;

  /* 0 — documents stored before the 72-hour gate existed had no review clock. */
  const legacy = claim.status as string;
  if (legacy === "verifying" || (legacy === "review" && !claim.reviewEndsAt)) {
    claim.status = "review";
    claim.reviewEndsAt = new Date(
      Date.parse(claim.initiatedAt) + REVIEW_HOURS * 3_600_000,
    ).toISOString();
    changed = true;
  }

  /* 1 — documents accepted and the registry check cleared: only now does the
     owner hear about the claim. The operator's decision is a real gate, not a
     formality — without it a claim sits in review however long it waits. */
  if (
    claim.status === "review" &&
    claim.decidedAt &&
    claim.reviewEndsAt &&
    Date.parse(claim.reviewEndsAt) <= Date.now()
  ) {
    claim.status = "window";
    claim.verifiedAt = claim.reviewEndsAt;
    claim.windowEndsAt = new Date(
      Date.parse(claim.reviewEndsAt) + SAFETY_WINDOW_DAYS * 86_400_000,
    ).toISOString();
    doc.plan.status = "claiming";
    doc.plan.updatedAt = now();

    addEvent(
      doc,
      "claim.verified",
      "Certificate verified",
      `Passed the ${REVIEW_HOURS}-hour registry check — the record on file matches ${doc.user.name}. Claim #${claim.id}.`,
      claim.reviewEndsAt,
      1,
    );
    addEvent(
      doc,
      "owner.notified",
      "Owner notified",
      `${doc.user.name} was told a handover has been filed and has ${SAFETY_WINDOW_DAYS} days to respond before anything moves.`,
      claim.reviewEndsAt,
      1,
    );
    changed = true;
  }

  /* 2 — the window closed with no answer: run the instructions. */
  if (claim.status === "window" && claim.windowEndsAt && Date.parse(claim.windowEndsAt) <= Date.now()) {
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
    changed = true;
  }

  return changed;
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
  doc.documents = [];
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

export interface SubmitClaimInput {
  accessCode: string;
  report: StoredReport;
  /** Which recorded assets this claim is about. Labels only — never balances. */
  assetIds?: number[];
  note?: string;
}

/**
 * Files a claim. The document has already been through lib/certs.ts on the
 * server, so a rejected file never reaches this point — but the check is
 * repeated here because this function is the gate that matters.
 */
export function submitClaim(doc: StateDoc, input: SubmitClaimInput): { ok: boolean; error?: string } {
  const { accessCode, report, note } = input;
  const assetIds = Array.isArray(input.assetIds) ? input.assetIds.filter((n) => Number.isInteger(n)) : [];
  const assetRefs = assetIds
    .map((id) => doc.assets.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map((a) => ({ id: a.id, label: a.label, kind: a.kind }));

  if (!doc.keyholder) return { ok: false, error: "No keyholder on file." };
  if (accessCode.trim().toUpperCase() !== doc.keyholder.accessCode.toUpperCase()) {
    return { ok: false, error: "That access code doesn't match the keyholder on file." };
  }
  const existing = latestClaim(doc);
  /* a refused claim is closed: the same person may file again with better papers */
  if (existing && existing.status !== "cancelled" && existing.status !== "rejected") {
    return { ok: false, error: "A handover is already in progress." };
  }
  if (report.verdict === "rejected") {
    return { ok: false, error: `That document can't start a claim. ${report.summary}` };
  }
  if (doc.claims.some((c) => c.documentHash === report.sha256)) {
    return { ok: false, error: "This exact document has already been filed on this plan." };
  }

  const stamp = now();
  const reviewEndsAt = new Date(Date.parse(stamp) + REVIEW_HOURS * 3_600_000).toISOString();

  doc.seq += 1;
  const claim: Claim = {
    id: doc.seq,
    planId: doc.plan.id,
    keyholderId: doc.keyholder.id,
    status: "review",
    documentName: report.fileName,
    documentHash: report.sha256,
    documentKind: report.kind,
    extracted: JSON.stringify(report.fields),
    verification: JSON.stringify(report),
    confidence: report.score / 100,
    initiatedAt: stamp,
    reviewEndsAt,
    verifiedAt: null,
    windowEndsAt: null,
    distributedAt: null,
    assetRefs: JSON.stringify(assetRefs),
    note: note?.trim() ? note.trim().slice(0, 600) : null,
    decisionNote: null,
    decidedAt: null,
  };
  doc.claims.push(claim);

  addEvent(
    doc,
    "claim.submitted",
    "Certificate filed — registry check running",
    `${doc.keyholder.name} filed ${report.fileName}${assetRefs.length ? ` for ${assetRefs.length} asset${assetRefs.length === 1 ? "" : "s"}` : ""}. Automated checks: ${report.verdict.replace("_", " ")}. The ${REVIEW_HOURS}-hour registry check ends ${reviewEndsAt}. The owner has not been notified yet.`,
    stamp,
    0, // internal: the owner must not see this until the check clears
  );

  return { ok: true };
}

/**
 * Demo shortcut: jump the 72-hour registry check. In production this is a
 * registry/back-office integration — never a keyholder button.
 */
export function verifyClaim(doc: StateDoc): { ok: boolean; error?: string } {
  const claim = latestClaim(doc);
  if (!claim) return { ok: false, error: "No claim submitted." };
  if (claim.status !== "review") {
    return { ok: false, error: "This claim isn't waiting on a registry check." };
  }
  claim.reviewEndsAt = now();
  settle(doc);
  return { ok: true };
}

/**
 * The operator's decision on the documents.
 *
 * Accepting releases the registry hold, and the claim then moves through its
 * safety window on its own. Refusing closes the claim where it stands: the plan
 * stays with its owner and the Trusted Key may file again with better papers.
 */
export function decideClaim(
  doc: StateDoc,
  decision: "accept" | "reject",
  note?: string,
): { ok: boolean; error?: string } {
  const claim = latestClaim(doc);
  if (!claim) return { ok: false, error: "No claim submitted." };
  if (claim.status !== "review") return { ok: false, error: "This handover is no longer in review." };

  const stamp = now();
  claim.decisionNote = note?.trim() ? note.trim().slice(0, 600) : null;
  claim.decidedAt = stamp;

  if (decision === "accept") {
    claim.reviewEndsAt = stamp;
    settle(doc);
    addEvent(
      doc,
      "claim.accepted",
      "Documents accepted",
      `The operator accepted the documents filed for claim #${claim.id}. The registry check is released and the ${SAFETY_WINDOW_DAYS}-day window begins.`,
      stamp,
    );
    return { ok: true };
  }

  claim.status = "rejected";
  doc.plan.status = "active";
  doc.plan.updatedAt = stamp;
  addEvent(
    doc,
    "claim.rejected",
    "Documents not accepted",
    `Claim #${claim.id} was refused. ${claim.decisionNote ?? "The documents on file were not enough to continue."} The plan stays with its owner.`,
    stamp,
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

/**
 * Demo controls for the two clocks. Skips the registry check if it is running,
 * then closes the safety window and lets the engine pay out.
 */
export function fastForward(doc: StateDoc): { ok: boolean; error?: string } {
  const claim = latestClaim(doc);
  if (!claim) return { ok: false, error: "There is no handover to fast-forward." };

  // One clock per press, so the demo walks through both gates in order.
  if (claim.status === "review") {
    claim.reviewEndsAt = now();
    claim.decidedAt = claim.decidedAt ?? claim.reviewEndsAt;
    settle(doc);
    return { ok: true };
  }

  if (claim.status !== "window") {
    return { ok: false, error: "There is no clock left to move." };
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


/* ------------------------------------------------------------------ assets -- */

export interface AssetInput {
  kind: Asset["kind"];
  label: string;
  provider: string;
  balanceCents: number;
  detail: string;
  url?: string;
  handoverNote?: string;
  accessNote?: string;
  monthlyCents?: number | null;
  customers?: number | null;
}

export function addAsset(doc: StateDoc, input: AssetInput): { ok: boolean; error?: string; id?: number } {
  if (!input.label.trim()) return { ok: false, error: "Give the asset a name." };
  if (!Number.isFinite(input.balanceCents) || input.balanceCents < 0) {
    return { ok: false, error: "Enter a value of zero or more." };
  }
  doc.seq += 1;
  const asset: Asset = {
    id: doc.seq,
    userId: doc.user.id,
    kind: input.kind,
    label: input.label.trim(),
    provider: input.provider.trim() || "Not specified",
    balanceCents: Math.round(input.balanceCents),
    detail: input.detail.trim(),
    connected: 1,
    url: input.url?.trim() || null,
    handoverNote: input.handoverNote?.trim() || null,
    accessNote: input.accessNote?.trim() || null,
    monthlyCents: input.monthlyCents ?? null,
    customers: input.customers ?? null,
    reviewed: 0 as number,
  };
  doc.assets.push(asset);
  doc.plan.updatedAt = now();
  addEvent(doc, "asset.added", `${asset.label} added`, `A ${asset.kind === "crypto" ? "crypto wallet" : asset.kind === "business" ? "digital business" : "payment account"} was added to the plan.`);
  return { ok: true, id: asset.id };
}

export function updateAsset(doc: StateDoc, id: number, patch: Partial<AssetInput>): { ok: boolean; error?: string } {
  const asset = doc.assets.find((a) => a.id === id);
  if (!asset) return { ok: false, error: "That asset no longer exists." };
  if (patch.label !== undefined) {
    if (!patch.label.trim()) return { ok: false, error: "Give the asset a name." };
    asset.label = patch.label.trim();
  }
  if (patch.provider !== undefined) asset.provider = patch.provider.trim() || asset.provider;
  if (patch.balanceCents !== undefined) {
    if (!Number.isFinite(patch.balanceCents) || patch.balanceCents < 0) {
      return { ok: false, error: "Enter a value of zero or more." };
    }
    asset.balanceCents = Math.round(patch.balanceCents);
  }
  if (patch.detail !== undefined) asset.detail = patch.detail.trim();
  if (patch.url !== undefined) asset.url = patch.url.trim() || null;
  if (patch.handoverNote !== undefined) asset.handoverNote = patch.handoverNote.trim() || null;
  if (patch.accessNote !== undefined) asset.accessNote = patch.accessNote.trim() || null;
  if (patch.monthlyCents !== undefined) asset.monthlyCents = patch.monthlyCents;
  if (patch.customers !== undefined) asset.customers = patch.customers;
  asset.reviewed = 1;
  doc.plan.updatedAt = now();
  addEvent(doc, "asset.updated", `${asset.label} updated`, "Asset details and handover instructions were reviewed.");
  return { ok: true };
}

export function removeAsset(doc: StateDoc, id: number): { ok: boolean; error?: string } {
  const before = doc.assets.length;
  doc.assets = doc.assets.filter((a) => a.id !== id);
  if (doc.assets.length === before) return { ok: false, error: "That asset no longer exists." };
  doc.plan.updatedAt = now();
  addEvent(doc, "asset.removed", "An asset was removed", "It is no longer part of the plan.");
  return { ok: true };
}

/* ----------------------------------------------------------- beneficiaries -- */

export interface BeneficiaryInput {
  name: string;
  email: string;
  relationship: string;
  role: Role;
  share?: number;
  note?: string;
}

export function addBeneficiary(doc: StateDoc, input: BeneficiaryInput): { ok: boolean; error?: string } {
  if (!input.name.trim()) return { ok: false, error: "Enter a name." };
  if (doc.beneficiaries.some((b) => b.role === input.role && input.role !== "backup")) {
    return { ok: false, error: `A ${input.role === "charity" ? "final cause" : "first choice"} is already on the plan.` };
  }
  const backups = doc.beneficiaries.filter((b) => b.role === "backup").length;
  doc.seq += 1;
  doc.beneficiaries.push({
    id: doc.seq,
    userId: doc.user.id,
    name: input.name.trim(),
    email: input.email.trim(),
    relationship: input.relationship.trim() || "Relationship not set",
    role: input.role,
    /* A backup added without a share joins an even split rather than sitting at
       zero and quietly breaking the 100% rule the page enforces. */
    share: input.share !== undefined ? input.share : input.role === "backup" ? 0 : 100,
    sort: input.role === "charity" ? 90 : input.role === "primary" ? 0 : backups + 1,
    available: 1,
    note: input.note?.trim() ?? "",
  });
  if (input.role === "backup" && input.share === undefined) {
    evenSplitBackups(doc);
  }
  doc.plan.updatedAt = now();
  addEvent(doc, "beneficiary.added", `${input.name.trim()} added`, `Added as ${input.role === "charity" ? "the final cause" : input.role === "primary" ? "the first choice" : "a family backup"}.`);
  return { ok: true };
}

/**
 * Spread 100% across the family backups, keeping the shape the owner set where
 * there is one. Used when a backup joins or leaves, so the percentages on the
 * page always add up to the estate that plan actually records.
 */
function evenSplitBackups(doc: StateDoc): void {
  const backups = doc.beneficiaries.filter((b) => b.role === "backup");
  if (!backups.length) return;
  const base = Math.floor(100 / backups.length);
  backups.forEach((b, i) => {
    b.share = i === backups.length - 1 ? 100 - base * (backups.length - 1) : base;
  });
}

function rebalanceBackups(doc: StateDoc): void {
  const backups = doc.beneficiaries.filter((b) => b.role === "backup");
  if (!backups.length) return;
  const current = backups.reduce((sum, b) => sum + (b.share || 0), 0);

  if (current <= 0) {
    const base = Math.floor(100 / backups.length);
    backups.forEach((b, i) => {
      b.share = i === backups.length - 1 ? 100 - base * (backups.length - 1) : base;
    });
    return;
  }

  let assigned = 0;
  backups.forEach((b, i) => {
    if (i === backups.length - 1) {
      b.share = Math.max(0, 100 - assigned);
      return;
    }
    const scaled = Math.round(((b.share || 0) / current) * 100);
    b.share = scaled;
    assigned += scaled;
  });
}

export function setAllocations(doc: StateDoc, shares: { id: number; share: number }[]): { ok: boolean; error?: string } {
  const backups = doc.beneficiaries.filter((b) => b.role === "backup");
  const total = shares.reduce((sum, s) => sum + (Number.isFinite(s.share) ? s.share : 0), 0);
  if (shares.some((s) => s.share < 0 || s.share > 100)) {
    return { ok: false, error: "Each share must be between 0% and 100%." };
  }
  if (backups.length > 0 && Math.round(total) !== 100) {
    return { ok: false, error: `Backup shares must total 100% — they currently total ${Math.round(total)}%.` };
  }
  for (const s of shares) {
    const b = doc.beneficiaries.find((x) => x.id === s.id && x.role === "backup");
    if (b) b.share = Math.round(s.share);
  }
  doc.plan.updatedAt = now();
  addEvent(doc, "beneficiaries.updated", "Backup shares updated", `Backups now split the estate ${shares.map((s) => `${Math.round(s.share)}%`).join(" / ")}.`);
  return { ok: true };
}

export function updateBeneficiary(
  doc: StateDoc,
  id: number,
  patch: { name?: string; email?: string; relationship?: string; note?: string; share?: number },
): { ok: boolean; error?: string } {
  const person = doc.beneficiaries.find((b) => b.id === id);
  if (!person) return { ok: false, error: "That person is not on the plan." };
  if (patch.name !== undefined) {
    if (!patch.name.trim()) return { ok: false, error: "Enter a name." };
    person.name = patch.name.trim();
  }
  if (patch.email !== undefined) person.email = patch.email.trim();
  if (patch.relationship !== undefined) person.relationship = patch.relationship.trim();
  if (patch.note !== undefined) person.note = patch.note.trim();
  if (patch.share !== undefined && person.role !== "primary") person.share = Math.max(0, Math.min(100, patch.share));
  doc.plan.updatedAt = now();
  addEvent(doc, "beneficiary.updated", `${person.name} updated`, "Contact details and notes were brought up to date.");
  return { ok: true };
}

export function removeBeneficiary(doc: StateDoc, id: number): { ok: boolean; error?: string } {
  const person = doc.beneficiaries.find((b) => b.id === id);
  if (!person) return { ok: false, error: "That person is not on the plan." };
  if (doc.beneficiaries.length === 1) {
    return { ok: false, error: "A plan needs at least one person named. Add someone else first." };
  }

  doc.beneficiaries = doc.beneficiaries.filter((b) => b.id !== id);
  /* Removing a backup silently changes who receives what; re-spread the 100%
     across whoever is left so the page never shows a plan that adds to 40%. */
  if (person.role === "backup") rebalanceBackups(doc);
  doc.plan.updatedAt = now();
  addEvent(
    doc,
    "beneficiary.removed",
    `${person.name} removed`,
    `They are no longer ${person.role === "primary" ? "the first choice" : person.role === "charity" ? "the final cause" : "a family backup"}. The rest of the plan is untouched.`,
  );
  return { ok: true };
}

/* --------------------------------------------------------------- documents -- */

export function addDocument(
  doc: StateDoc,
  input: { name: string; sizeKb: number; relatedTo: string; access: DocumentRow["access"] },
): { ok: boolean; error?: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Give the document a name." };
  if (!/\.pdf$/i.test(name)) return { ok: false, error: "Only PDF documents are accepted in this prototype." };
  if (input.sizeKb > 10_240) return { ok: false, error: "Documents must be 10 MB or smaller." };
  doc.seq += 1;
  const stamp = now();
  doc.documents.push({
    id: doc.seq,
    userId: doc.user.id,
    name,
    kind: name.split(".").pop()?.toUpperCase() ?? "PDF",
    sizeKb: Math.max(1, Math.round(input.sizeKb)),
    relatedTo: input.relatedTo || "My Plan",
    access: input.access,
    updatedAt: stamp,
    createdAt: stamp,
  });
  addEvent(doc, "document.added", `${name} added`, `Guidance for ${input.relatedTo || "the plan"}. Never upload passwords or recovery phrases.`);
  return { ok: true };
}

/* ----------------------------------------------------------------- profile -- */

export function updateProfile(
  doc: StateDoc,
  input: { name?: string; email?: string; phone?: string; timezone?: string },
): { ok: boolean; error?: string } {
  if (input.name !== undefined) {
    if (!input.name.trim()) return { ok: false, error: "Enter your name." };
    doc.user.name = input.name.trim();
  }
  if (input.email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return { ok: false, error: "Enter a valid email address." };
    doc.user.email = input.email.trim();
  }
  if (input.phone !== undefined) doc.user.phone = input.phone.trim();
  if (input.timezone !== undefined) doc.user.timezone = input.timezone.trim();
  addEvent(doc, "profile.updated", "Profile updated", "Contact details kept current so a safety notice can reach the account holder.");
  return { ok: true };
}

/* -------------------------------------------------------------------- plan -- */

export function sealPlan(doc: StateDoc): { ok: boolean; error?: string } {
  if (doc.plan.sealedAt) return { ok: false, error: "This plan is already sealed." };
  const steps = planSteps(doc);
  const missing = steps.filter((s) => !s.done && s.key !== "review");
  if (missing.length) {
    return { ok: false, error: `Finish these first: ${missing.map((m) => m.label).join(", ")}.` };
  }
  const stamp = now();
  doc.plan.sealedAt = stamp;
  doc.plan.updatedAt = stamp;
  doc.plan.status = "active";
  addEvent(doc, "plan.sealed", "Plan sealed", `${doc.user.name} sealed a plan covering ${doc.assets.length} accounts and ${doc.beneficiaries.length} recipients.`, stamp);
  return { ok: true };
}

/* ------------------------------------------------------- role-scoped views -- */

/**
 * What a keyholder is allowed to know. Deliberately excludes balances, asset
 * details, recipient names, shares and anything from the 72-hour review that
 * belongs to the owner. The portal renders this shape only — there is nothing
 * downstream to hide.
 */
export interface KeyholderView {
  ownerName: string;
  ownerFirstName: string;
  planStatus: PlanStatus;
  sealedAt: string | null;
  recipientCount: number;
  /**
   * `accessCode` is only present when the visitor has proved the address the
   * owner named — a bare share link never carries the code, because the owner
   * was told to send it by a different route.
   */
  keyholder: { name: string; relationship: string; accessCode: string | null } | null;
  /** The assets this plan records, named only — never valued. */
  assets: { id: number; label: string; kind: string; provider: string }[];
  claim: {
    id: number;
    status: ClaimStatus;
    documentName: string;
    confidence: number;
    initiatedAt: string;
    reviewEndsAt: string | null;
    verifiedAt: string | null;
    windowEndsAt: string | null;
    distributedAt: string | null;
    verification: string;
    assets: { id: number; label: string; kind: string }[];
    note: string | null;
    decisionNote: string | null;
  } | null;
  secondsToReviewEnd: number | null;
  secondsToWindowEnd: number | null;
  trail: { id: number; title: string; body: string; createdAt: string }[];
}

export function keyholderView(doc: StateDoc): KeyholderView {
  const claim = latestClaim(doc);
  return {
    ownerName: doc.user.name,
    ownerFirstName: doc.user.name.split(" ")[0],
    planStatus: doc.plan.status,
    sealedAt: doc.plan.sealedAt,
    recipientCount: doc.beneficiaries.length,
    keyholder: doc.keyholder
      ? {
          name: doc.keyholder.name,
          relationship: doc.keyholder.relationship,
          accessCode: doc.keyholder.accessCode,
        }
      : null,
    /* names and providers only: a Trusted Key never sees a value or a share */
    assets: doc.assets.map((a) => ({ id: a.id, label: a.label, kind: a.kind, provider: a.provider })),
    claim: claim
      ? {
          id: claim.id,
          status: claim.status,
          documentName: claim.documentName,
          confidence: claim.confidence,
          initiatedAt: claim.initiatedAt,
          reviewEndsAt: claim.reviewEndsAt,
          verifiedAt: claim.verifiedAt,
          windowEndsAt: claim.windowEndsAt,
          distributedAt: claim.distributedAt,
          verification: claim.verification,
          assets: (() => {
            try {
              const parsed = JSON.parse(claim.assetRefs ?? "[]") as { id: number; label: string; kind: string }[];
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })(),
          note: claim.note ?? null,
          decisionNote: claim.decisionNote ?? null,
        }
      : null,
    secondsToReviewEnd:
      claim && claim.status === "review" && claim.reviewEndsAt
        ? Math.max(0, Math.floor((new Date(claim.reviewEndsAt).getTime() - Date.now()) / 1000))
        : null,
    secondsToWindowEnd:
      claim && claim.status === "window" && claim.windowEndsAt
        ? Math.max(0, Math.floor((new Date(claim.windowEndsAt).getTime() - Date.now()) / 1000))
        : null,
    trail: [...doc.events].reverse().slice(0, 8).map((e) => ({
      id: e.id,
      title: e.title,
      body: e.body,
      createdAt: e.createdAt,
    })),
  };
}

/**
 * What one beneficiary is allowed to know. Their own entitlement exists only
 * after a verified claim clears the full 14-day window — before that, even the
 * amount is absent from this shape.
 */
export interface BeneficiaryView {
  ownerName: string;
  ownerFirstName: string;
  person: { id: number; name: string; email: string; relationship: string };
  phase: "idle" | "window" | "released";
  verifiedAt: string | null;
  windowEndsAt: string | null;
  distributedAt: string | null;
  secondsToWindowEnd: number | null;
  daysRemaining: number | null;
  entitlement: {
    amountCents: number;
    share: number;
    assets: { id: number; label: string; kind: AssetKind; provider: string; amountCents: number }[];
    note: string;
    documents: { id: number; name: string; kind: string; sizeKb: number; relatedTo: string }[];
  } | null;
}

export function beneficiaryView(doc: StateDoc): BeneficiaryView {
  const claim = latestClaim(doc);
  const released = claim?.status === "distributed";
  const distributions = claim ? doc.distributions.filter((d) => d.claimId === claim.id) : [];
  const primary = doc.beneficiaries.find((b) => b.role === "primary");
  const paidPrimary = primary && distributions.some((d) => d.beneficiaryId === primary.id);
  const focusId = released && !paidPrimary ? distributions[0]?.beneficiaryId : primary?.id;
  const person = doc.beneficiaries.find((b) => b.id === focusId) ?? doc.beneficiaries[0];

  const distribution = released
    ? distributions.find((d) => d.beneficiaryId === person?.id)
    : undefined;

  const secondsToWindowEnd =
    claim && claim.status === "window" && claim.windowEndsAt
      ? Math.max(0, Math.floor((new Date(claim.windowEndsAt).getTime() - Date.now()) / 1000))
      : null;

  const total = totalCents(doc) || 1;

  return {
    ownerName: doc.user.name,
    ownerFirstName: doc.user.name.split(" ")[0],
    person: {
      id: person?.id ?? 0,
      name: person?.name ?? "Beneficiary",
      email: person?.email ?? "",
      relationship: person?.relationship ?? "",
    },
    phase: released && distribution ? "released" : claim?.status === "window" ? "window" : "idle",
    verifiedAt: claim?.verifiedAt ?? null,
    windowEndsAt: claim?.windowEndsAt ?? null,
    distributedAt: claim?.distributedAt ?? null,
    secondsToWindowEnd,
    daysRemaining: secondsToWindowEnd !== null ? Math.ceil(secondsToWindowEnd / 86400) : null,
    entitlement:
      released && distribution
        ? {
            amountCents: distribution.amountCents,
            share: distribution.share,
            assets: doc.assets.map((a) => ({
              id: a.id,
              label: a.label,
              kind: a.kind,
              provider: a.provider,
              amountCents: Math.round((a.balanceCents * distribution.amountCents) / total),
            })),
            note: person?.note ?? "",
            documents: (doc.documents ?? [])
              .filter((d) => d.access === "beneficiaries")
              .map((d) => ({ id: d.id, name: d.name, kind: d.kind, sizeKb: d.sizeKb, relatedTo: d.relatedTo })),
          }
        : null,
  };
}

/* ------------------------------------------------------------- stash & saves */

export interface PotInput {
  name: string;
  purpose: string;
  targetCents?: number;
  beneficiaryId?: number | null;
}

/**
 * "What is this money for?" — the question the app asks after a transfer.
 * A pot is a stated purpose, not a second bank account: the balance stays in
 * the payout account, and the document records the intention.
 */
export function createPot(doc: StateDoc, input: PotInput): { ok: boolean; error?: string; id?: number } {
  const name = input.name.trim();
  const purpose = input.purpose.trim();
  if (name.length < 2) return { ok: false, error: "Give this save a name." };
  if (purpose.length < 4) return { ok: false, error: "Say what the money is for." };

  doc.seq += 1;
  const pot: Pot = {
    id: doc.seq,
    name,
    purpose,
    targetCents: Math.max(0, Math.round(input.targetCents ?? 0)),
    allocatedCents: 0,
    beneficiaryId: input.beneficiaryId ?? null,
    createdAt: now(),
  };
  doc.pots = [...(doc.pots ?? []), pot];
  doc.plan.updatedAt = now();
  addEvent(doc, "pot.created", `${pot.name} created`, `A save was named: ${purpose}`);
  return { ok: true, id: pot.id };
}

export function allocateToPot(
  doc: StateDoc,
  potId: number,
  amountCents: number,
  direction: "to" | "from",
): { ok: boolean; error?: string } {
  const amount = Math.round(amountCents);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter an amount above zero." };

  const pot = (doc.pots ?? []).find((p) => p.id === potId);
  if (!pot) return { ok: false, error: "That save no longer exists." };

  const stash = doc.stashCents ?? 0;
  if (direction === "to") {
    if (amount > stash) return { ok: false, error: "That is more than the money waiting in your stash." };
    doc.stashCents = stash - amount;
    pot.allocatedCents += amount;
  } else {
    if (amount > pot.allocatedCents) return { ok: false, error: "That is more than this save holds." };
    pot.allocatedCents -= amount;
    doc.stashCents = stash + amount;
  }

  doc.plan.updatedAt = now();
  addEvent(
    doc,
    direction === "to" ? "money.saved" : "money.unsaved",
    direction === "to" ? `Moved into ${pot.name}` : `Moved back from ${pot.name}`,
    `${money(amount)} ${direction === "to" ? "set aside for" : "returned to the stash from"} ${pot.purpose.toLowerCase()}.`,
  );
  return { ok: true };
}

export interface MoveInput {
  kind: MoneyMove["kind"];
  amountCents: number;
  potId?: number | null;
  counterparty?: string | null;
  note?: string;
  status?: MoneyMove["status"];
  providerId?: string | null;
}

/** The ledger every send, receive and top-up lands in. */
export function recordMove(doc: StateDoc, input: MoveInput): { ok: boolean; error?: string; id?: number } {
  const amount = Math.round(input.amountCents);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter an amount above zero." };

  doc.seq += 1;
  const move: MoneyMove = {
    id: doc.seq,
    kind: input.kind,
    amountCents: amount,
    potId: input.potId ?? null,
    counterparty: input.counterparty?.trim() || null,
    note: input.note?.trim() ?? "",
    status: input.status ?? "recorded",
    providerId: input.providerId ?? null,
    createdAt: now(),
  };
  doc.moves = [...(doc.moves ?? []), move];

  if (move.status === "recorded") {
    if (move.kind === "in") doc.stashCents = (doc.stashCents ?? 0) + amount;
    if (move.kind === "out") doc.stashCents = Math.max(0, (doc.stashCents ?? 0) - amount);
  }

  doc.plan.updatedAt = now();
  addEvent(
    doc,
    `money.${move.kind}`,
    move.kind === "in" ? "Money added" : move.kind === "out" ? "Money sent" : "Money moved",
    `${money(amount)}${move.counterparty ? ` · ${move.counterparty}` : ""}`,
  );
  return { ok: true, id: move.id };
}

/* ------------------------------------------------------------------- vault */

/** What the vault holds: money in PayHalo plus the value recorded in assets. */
export function vaultBalanceCents(doc: StateDoc): number {
  const cash = (Number(doc.stashCents) || 0) + (doc.pots ?? []).reduce((sum, p) => sum + (Number(p.allocatedCents) || 0), 0);
  return cash + totalCents(doc);
}

export interface KeyholderInput {
  name: string;
  email: string;
  relationship: string;
  accessCode?: string;
}

/**
 * The trusted keyholder. They can open a claim; they never see balances, names
 * or shares. The access code is the only thing they hold.
 */
export function setKeyholder(doc: StateDoc, input: KeyholderInput): { ok: boolean; error?: string; accessCode?: string } {
  if (!input.name.trim()) return { ok: false, error: "Enter the name of your trusted person." };
  if (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.email.trim())) {
    return { ok: false, error: "That email does not look right." };
  }

  const code =
    input.accessCode?.trim() ||
    doc.keyholder?.accessCode ||
    `KEY-${String(Math.floor(1000 + Math.random() * 9000))}`;

  doc.seq += 1;
  doc.keyholder = {
    id: doc.keyholder?.id ?? doc.seq,
    userId: doc.user.id,
    name: input.name.trim(),
    email: input.email.trim(),
    relationship: input.relationship.trim(),
    accessCode: code,
  };
  doc.plan.updatedAt = now();
  addEvent(doc, "keyholder.set", "Keyholder named", `${doc.keyholder.name} can open a claim, and nothing else.`);
  return { ok: true, accessCode: code };
}

function vaultRef(doc: StateDoc): string {
  const n = doc.plan.id;
  let tail = "";
  for (let i = 0; i < 6; i += 1) tail += "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)];
  return `PH-${n}-${tail}`;
}

/**
 * Start the plan: open the vault. This is the moment the plan stops being a
 * draft on a screen and becomes something with a reference, a destination for
 * money, and a first beneficiary who will receive a key.
 */
export function openVault(doc: StateDoc): { ok: boolean; error?: string; vault?: Vault } {
  if (doc.vault && doc.vault.status !== "released") {
    return { ok: false, error: "This plan already has an open vault." };
  }
  const unfinished = planSteps(doc).filter((s) => !s.done && s.key !== "review");
  if (unfinished.length) {
    return { ok: false, error: `Finish your plan first: ${unfinished.map((s) => s.label).join(", ")}.` };
  }
  const vault: Vault = {
    ref: vaultRef(doc),
    openedAt: now(),
    status: "open",
    keySentAt: null,
    keyTo: null,
    keyHash: null,
    releasedAt: null,
    releaseRef: null,
  };
  doc.vault = vault;
  if (!doc.plan.sealedAt) doc.plan.status = "draft";
  doc.plan.updatedAt = now();
  addEvent(doc, "vault.opened", "Vault opened", `Vault ${vault.ref} is open and ready for money.`);
  return { ok: true, vault };
}

export function markKeySent(doc: StateDoc, email: string, keyHash?: string): void {
  if (!doc.vault) return;
  doc.vault.keySentAt = now();
  doc.vault.keyTo = email;
  if (keyHash) doc.vault.keyHash = keyHash;
  doc.plan.updatedAt = now();
  addEvent(doc, "vault.key", "Key sent", `The vault key went to ${email}.`);
}

export interface ReleaseInput {
  requestedBy: ReleaseRequest["requestedBy"];
  requesterName: string;
  requesterEmail: string;
  beneficiaryId?: number | null;
  note?: string;
}

/**
 * File a release request. Anyone the plan names may ask; nobody may decide.
 * The request is advisory until an operator researches the death
 * documentation, which is the only path that can open a vault.
 */
export function requestRelease(doc: StateDoc, input: ReleaseInput): { ok: boolean; error?: string; id?: number; ref?: string } {
  if (!doc.vault) return { ok: false, error: "This plan has no vault yet." };
  if (doc.vault.status === "released") return { ok: false, error: "This vault has already been released." };
  const open = (doc.releaseRequests ?? []).find((r) => r.status === "pending" || r.status === "researching");
  if (open) return { ok: false, error: "A release is already under review for this plan." };

  doc.seq += 1;
  const id = doc.seq;
  const ref = `RR-${doc.plan.id}-${String(id).padStart(3, "0")}`;
  const request: ReleaseRequest = {
    id,
    ref,
    requestedBy: input.requestedBy,
    requesterName: input.requesterName.trim() || "Named beneficiary",
    requesterEmail: input.requesterEmail.trim().toLowerCase(),
    beneficiaryId: input.beneficiaryId ?? null,
    note: (input.note ?? "").trim().slice(0, 600),
    status: "pending",
    createdAt: now(),
    decidedAt: null,
    decidedBy: null,
    adminNote: "",
  };
  doc.releaseRequests = [...(doc.releaseRequests ?? []), request];
  doc.plan.updatedAt = now();
  addEvent(doc, "release.requested", "Release requested", `${request.requesterName} asked for the vault to be opened (${ref}).`);
  return { ok: true, id, ref };
}

/**
 * The operator's decision. Approving is the only thing in the product that
 * marks a vault released, and the money can still only go to the plan's own
 * beneficiaries — there is no amount or destination in this signature.
 */
export function decideRelease(
  doc: StateDoc,
  id: number,
  decision: "researching" | "approved" | "rejected",
  adminNote: string,
  decidedBy: string,
): { ok: boolean; error?: string } {
  const request = (doc.releaseRequests ?? []).find((r) => r.id === id);
  if (!request) return { ok: false, error: "That request is gone." };
  if (request.status === "approved" || request.status === "rejected") {
    return { ok: false, error: "That request has already been decided." };
  }

  request.status = decision;
  request.adminNote = adminNote.trim().slice(0, 600);
  request.decidedBy = decidedBy;

  if (decision === "approved") {
    request.decidedAt = now();
    if (doc.vault) {
      doc.vault.status = "released";
      doc.vault.releasedAt = now();
      doc.vault.releaseRef = request.ref;
    }
    addEvent(
      doc,
      "release.approved",
      "Release approved",
      `${request.ref} approved after documentation review. The vault is open to the plan's beneficiaries only.`,
    );
  } else if (decision === "rejected") {
    request.decidedAt = now();
    addEvent(doc, "release.rejected", "Release declined", `${request.ref} was declined${adminNote ? `: ${adminNote}` : "."}`);
  } else {
    addEvent(doc, "release.researching", "Documentation under review", `${request.ref} is being checked.`);
  }

  doc.plan.updatedAt = now();
  return { ok: true };
}
