import { cookies } from "next/headers";
import { getDriver } from "./storage";
import {
  addAsset,
  allocateToPot,
  beneficiaryView,
  addBeneficiary,
  addDocument,
  applyPlan,
  cancelClaim,
  emptyDoc,
  removeAsset,
  removeBeneficiary,
  sealPlan,
  setAllocations,
  latestClaim,
  setAvailability,
  settle,
  snapshotOf,
  submitClaim,
  updateAsset,
  updateBeneficiary,
  createPot,
  recordMove,
  openVault,
  markKeySent,
  setKeyholder,
  requestRelease,
  decideRelease,
  vaultBalanceCents,
  updateProfile,
  keyholderView,
  verifyClaim,
  decideClaim,
  recordEvent,
  type AssetInput,
  type Audience,
  type BeneficiaryInput,
  type MoveInput,
  type PlanInput,
  type PotInput,
  type StateDoc,
} from "./model";
import type { StoredReport } from "./certs";
import type { ReleaseRequest, Snapshot, Vault } from "./types";
import { hashVaultKey, mintVaultKey, vaultKeyMatches } from "./vault-key";
import type { Draft } from "./ai";
import { currentUser, requireOwner, sharedOwner } from "./scope";

export { SAFETY_WINDOW_DAYS, REVIEW_HOURS } from "./model";
export { vaultBalanceCents } from "./model";
export type { Audience } from "./model";
export type { PlanInput } from "./model";
export type { BeneficiaryView, KeyholderView } from "./model";

/**
 * Every read is scoped to one owner's document. The owner id is the auth user
 * id; a keyholder or beneficiary never gets an owner id — they present a signed
 * share link, and only the redacted view builders run against it.
 */

type MutationResult = { ok: boolean; error?: string; extra?: Record<string, unknown> };

/**
 * One account, several arrangements.
 *
 * A plan is a whole document of its own — its own assets, people, Trusted Key,
 * vault and history. The first one keeps the bare account key that older
 * documents were written under; every later one is suffixed, so switching plans
 * switches documents rather than filtering one enormous one.
 */
const PLAN_SEP = "#p";
export const PLAN_COOKIE = "vivo_plan";

export function planKey(userId: string, no: number) {
  return no <= 1 ? userId : `${userId}${PLAN_SEP}${no}`;
}

export function planNoOf(key: string, userId: string): number | null {
  if (key === userId) return 1;
  const prefix = `${userId}${PLAN_SEP}`;
  if (!key.startsWith(prefix)) return null;
  const n = Number(key.slice(prefix.length));
  return Number.isInteger(n) && n > 1 ? n : null;
}

/** Which arrangement the owner is looking at. A stale cookie falls back to the first. */
async function activePlanNo(): Promise<number> {
  const jar = await cookies();
  const n = Number(jar.get(PLAN_COOKIE)?.value);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

async function loadDoc(ownerId: string, identity?: { name: string; email: string }): Promise<StateDoc> {
  const driver = await getDriver();
  const existing = await driver.load(ownerId);
  if (existing) return existing;
  return emptyDoc({ id: ownerId, name: identity?.name ?? "", email: identity?.email ?? "" });
}

/** Owner-scoped load: the signed-in account, or a fresh empty plan. */
async function ownerDoc(): Promise<{ ownerId: string; doc: StateDoc }> {
  const user = await requireOwner();
  const driver = await getDriver();
  const identity = { name: user.name, email: user.email };

  let no = await activePlanNo();
  let key = planKey(user.id, no);
  let doc = await driver.load(key);

  // a cookie naming a plan that was never written must not invent one
  if (!doc && no > 1) {
    no = 1;
    key = planKey(user.id, 1);
    doc = await driver.load(key);
  }

  return { ownerId: key, doc: doc ?? emptyDoc({ id: key, name: identity.name, email: identity.email }) };
}

/**
 * The actor may be the signed-in owner or a keyholder holding a valid link.
 * Only the keyholder flow uses this: filing and verifying a claim.
 */
async function actorDoc(): Promise<{ ownerId: string; doc: StateDoc }> {
  /*
   * Order matters. A keyholder may be holding a share link, may be signed in
   * with the address the owner named, or — in the demo — may do both. The plan
   * they were named on is the plan they act on; their own account, if they have
   * one, is never touched by a claim.
   */
  const shared = await sharedOwner("keyholder");
  if (shared) return { ownerId: shared, doc: await loadDoc(shared) };

  const user = await currentUser();
  if (user) {
    throw new Error("You are not named as a Trusted Key on any plan.");
  }
  throw new Error("This link is not valid.");
}

/** Share-link load: somebody else's plan, read-only, audience-checked. */
async function sharedDoc(audience: Audience): Promise<StateDoc | null> {
  if (audience === "owner") return null;
  const ownerId = await sharedOwner(audience);
  if (!ownerId) return null;
  return loadDoc(ownerId);
}

export async function getSnapshot(audience: Audience = "owner"): Promise<Snapshot> {
  if (audience !== "owner") {
    const doc = await sharedDoc(audience);
    if (!doc) throw new Error("This link is not valid.");
    return { ...snapshotOf(doc, audience), storage: (await getDriver()).kind };
  }

  const driver = await getDriver();
  const { ownerId, doc } = await ownerDoc();
  if (settle(doc)) await driver.save(ownerId, doc);
  return { ...snapshotOf(doc, audience), storage: driver.kind };
}

async function mutate(
  fn: (doc: StateDoc) => MutationResult,
  audience: Audience = "owner",
): Promise<MutationResult & { snapshot: Snapshot }> {
  const driver = await getDriver();
  const { ownerId, doc } = audience === "keyholder" ? await actorDoc() : await ownerDoc();
  if (settle(doc)) await driver.save(ownerId, doc);
  const result = fn(doc);
  if (result.ok) await driver.save(ownerId, doc);
  return { ...result, snapshot: { ...snapshotOf(doc, audience), storage: driver.kind } };
}

export async function savePlan(input: PlanInput): Promise<Snapshot> {
  const driver = await getDriver();
  const user = await requireOwner();
  const doc = applyPlan(input);
  await driver.save(planKey(user.id, await activePlanNo()), doc);
  return { ...snapshotOf(doc), storage: driver.kind };
}

/** The document key of the arrangement currently on screen — the thing a share link points at. */
export async function activePlanKey(): Promise<string> {
  const user = await requireOwner();
  return planKey(user.id, await activePlanNo());
}

export interface PlanSummary {
  no: number;
  key: string;
  name: string;
  status: string;
  updatedAt: string;
  sealedAt: string | null;
  done: number;
  total: number;
  valueCents: number;
  assets: number;
  people: number;
  active: boolean;
  /** A sealed plan carries its own vault; this is where it stands. */
  vault: { ref: string; status: string } | null;
  keyholderName: string | null;
  beneficiaryNames: string[];
}

/** Every arrangement this account holds, in the order they were made. */
export async function listPlans(): Promise<PlanSummary[]> {
  const driver = await getDriver();
  const user = await requireOwner();
  const active = await activePlanNo();
  const found: { no: number; key: string; doc: StateDoc }[] = [];

  if (driver.scan) {
    for (const row of await driver.scan()) {
      const no = planNoOf(row.key, user.id);
      if (no) found.push({ no, key: row.key, doc: row.doc });
    }
  }

  if (!found.length) {
    const key = planKey(user.id, active);
    const doc = await driver.load(key);
    if (doc) found.push({ no: active, key, doc });
  }

  return found
    .sort((a, b) => a.no - b.no)
    .map(({ no, key, doc }) => {
      const snap = snapshotOf(doc, "owner");
      const steps = snap.steps;
      return {
        no,
        key,
        name: doc.plan.name?.trim() || (no === 1 ? "My plan" : `Plan ${no}`),
        status: doc.plan.status,
        updatedAt: snap.plan.updatedAt,
        sealedAt: doc.plan.sealedAt,
        done: steps.filter((s) => s.done).length,
        total: steps.length,
        valueCents: vaultBalanceCents(doc),
        assets: doc.assets.length,
        people: doc.beneficiaries.length,
        active: no === active,
        vault: doc.vault ? { ref: doc.vault.ref, status: doc.vault.status } : null,
        keyholderName: doc.keyholder?.name ?? null,
        beneficiaryNames: doc.beneficiaries.map((b) => b.name),
      };
    });
}

/**
 * A second (or third) arrangement. It starts empty on purpose: copying someone's
 * beneficiaries into a plan they did not describe would be inventing intent.
 */
export async function createPlanAction(name: string): Promise<{ ok: boolean; no?: number; error?: string }> {
  const user = await requireOwner();
  const driver = await getDriver();
  const existing = await listPlans();
  const no = existing.reduce((max, p) => Math.max(max, p.no), 0) + 1;

  if (no > 9) return { ok: false, error: "Nine arrangements is the limit for one account." };

  const doc = emptyDoc({ id: planKey(user.id, no), name: user.name, email: user.email });
  doc.plan = { ...doc.plan, id: no + 1, name: name.trim().slice(0, 60) || `Plan ${no}` };
  await driver.save(planKey(user.id, no), doc);
  return { ok: true, no };
}

/**
 * Move one asset record from the plan on screen into another arrangement.
 *
 * The record keeps its label, provider, figure and notes; it is re-numbered in
 * the destination so nothing collides. Both plans get a dated line, because an
 * asset leaving one set of instructions and joining another is exactly the kind
 * of change a family may one day need to trace. A sealed plan accepts the asset:
 * it then belongs to that plan's vault and to that plan's people, since one plan
 * has one vault.
 */
export async function moveAssetToPlanAction(
  assetId: number,
  toPlanNo: number,
): Promise<{ ok: boolean; error?: string; toName?: string; sealed?: boolean }> {
  const user = await requireOwner();
  const driver = await getDriver();
  const fromNo = await activePlanNo();

  if (!Number.isInteger(toPlanNo) || toPlanNo < 1) return { ok: false, error: "Choose an arrangement first." };
  if (toPlanNo === fromNo) return { ok: false, error: "That asset is already in this arrangement." };
  if (toPlanNo > 9) return { ok: false, error: "That arrangement does not exist." };

  const fromKey = planKey(user.id, fromNo);
  const toKey = planKey(user.id, toPlanNo);
  const from = await driver.load(fromKey);
  const to = await driver.load(toKey);

  if (!from) return { ok: false, error: "This arrangement has no record yet." };
  if (!to) return { ok: false, error: "That arrangement no longer exists." };

  const claim = latestClaim(from);
  if (claim && claim.status !== "cancelled" && claim.status !== "rejected" && claim.status !== "distributed") {
    return { ok: false, error: "A handover is running on this arrangement. Assets cannot move until it closes." };
  }

  const asset = from.assets.find((a) => a.id === assetId);
  if (!asset) return { ok: false, error: "That asset is not in this arrangement." };

  const toName = to.plan.name?.trim() || `Plan ${toPlanNo}`;
  const fromName = from.plan.name?.trim() || `Plan ${fromNo}`;

  from.assets = from.assets.filter((a) => a.id !== assetId);
  from.plan.updatedAt = new Date().toISOString();
  recordEvent(
    from,
    "asset.moved",
    `${asset.label} moved to ${toName}`,
    `The record left this arrangement and joined ${toName}. Its people and shares here are unchanged.`,
  );

  to.seq += 1;
  to.assets.push({ ...asset, id: to.seq, userId: to.user.id });
  to.plan.updatedAt = new Date().toISOString();
  recordEvent(
    to,
    "asset.moved",
    `${asset.label} moved in from ${fromName}`,
    to.vault
      ? `The asset now sits inside vault ${to.vault.ref} and is allocated to this arrangement's people.`
      : `The asset now belongs to this arrangement and its people.`,
  );

  await driver.save(fromKey, from);
  await driver.save(toKey, to);

  return { ok: true, toName, sealed: Boolean(to.plan.sealedAt) };
}

export async function renamePlanAction(no: number, name: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireOwner();
  const driver = await getDriver();
  const key = planKey(user.id, no);
  const doc = await driver.load(key);
  if (!doc) return { ok: false, error: "That arrangement no longer exists." };
  const clean = name.trim().slice(0, 60);
  if (!clean) return { ok: false, error: "Give the arrangement a name first." };
  doc.plan = { ...doc.plan, name: clean, updatedAt: new Date().toISOString() };
  await driver.save(key, doc);
  return { ok: true };
}

/** Every document hash already filed on this plan — used to catch duplicates. */
export async function existingHashes(): Promise<string[]> {
  const owner = await sharedOwner("keyholder");
  const doc = owner ? await loadDoc(owner) : (await ownerDoc()).doc;
  return doc.claims.map((c) => c.documentHash).filter(Boolean);
}

export async function submitClaimAction(
  accessCode: string,
  report: StoredReport,
  extra?: { assetIds?: number[]; note?: string },
): Promise<MutationResult & { snapshot: Snapshot }> {
  return mutate((doc) => submitClaim(doc, { accessCode, report, ...extra }), "keyholder");
}

/** The operator's decision on a filed claim: accept the documents, or refuse them. */
export async function decideClaimAction(decision: "accept" | "reject", note?: string) {
  return mutate((doc) => decideClaim(doc, decision, note), "keyholder");
}

/**
 * The verification desk acts on a claim, not on a session.
 *
 * An operator is neither the owner nor the Trusted Key, so the document is
 * found by the claim itself: the account's address names the plan, the claim
 * number names the request inside it. Decisions are recorded on that plan and
 * nowhere else.
 */
export async function decideClaimByReview(
  input: { ownerEmail: string; claimId: number },
  decision: "accept" | "reject",
  note?: string,
) {
  const driver = await getDriver();
  let docs: { key: string; doc: StateDoc }[] = [];
  try {
    docs = driver.scan ? await driver.scan() : [];
  } catch {
    docs = [];
  }
  const email = input.ownerEmail.trim().toLowerCase();
  const hit = docs.find(
    ({ doc }) =>
      doc.user.email.trim().toLowerCase() === email &&
      doc.claims.some((c) => c.id === input.claimId && c.status === "review"),
  );
  if (!hit) return { ok: false as const, error: "That request is no longer waiting for a decision." };

  const { key, doc } = hit;
  if (settle(doc)) await driver.save(key, doc);
  const result = decideClaim(doc, decision, note);
  if (result.ok) await driver.save(key, doc);
  return { ...result, snapshot: snapshotOf(doc, "keyholder") };
}

export async function verifyClaimAction() {
  return mutate((doc) => verifyClaim(doc), "keyholder");
}

export async function cancelClaimAction() {
  return mutate((doc) => cancelClaim(doc));
}

export async function setAvailabilityAction(id: number, available: boolean) {
  return mutate((doc) => setAvailability(doc, id, available));
}

/**
 * Storage health for the sign-in screen: asks the driver for a document and
 * reports whether the durable store answered.
 */
export async function storageKind() {
  const driver = await getDriver();
  let ok = true;
  let error: string | undefined;
  try {
    await driver.load("00000000-0000-0000-0000-000000000000");
  } catch (e) {
    ok = false;
    error = e instanceof Error ? e.message : String(e);
  }
  return { kind: driver.kind, label: driver.label, durable: driver.durable, ok, error };
}

export { latestClaim };

/* ------------------------------------------------------- owner-side actions -- */

export async function addAssetAction(input: AssetInput) {
  return mutate((doc) => addAsset(doc, input));
}

export async function updateAssetAction(id: number, patch: Partial<AssetInput>) {
  return mutate((doc) => updateAsset(doc, id, patch));
}

export async function removeAssetAction(id: number) {
  return mutate((doc) => removeAsset(doc, id));
}

export async function addBeneficiaryAction(input: BeneficiaryInput) {
  return mutate((doc) => addBeneficiary(doc, input));
}

export async function setAllocationsAction(shares: { id: number; share: number }[]) {
  return mutate((doc) => setAllocations(doc, shares));
}

export async function updateBeneficiaryAction(
  id: number,
  patch: { name?: string; email?: string; relationship?: string; note?: string; share?: number },
) {
  return mutate((doc) => updateBeneficiary(doc, id, patch));
}

export async function removeBeneficiaryAction(id: number) {
  return mutate((doc) => removeBeneficiary(doc, id));
}

export async function addDocumentAction(input: {
  name: string;
  sizeKb: number;
  relatedTo: string;
  access: "owner" | "beneficiaries";
}) {
  return mutate((doc) => addDocument(doc, input));
}

export async function updateProfileAction(input: {
  name?: string;
  email?: string;
  phone?: string;
  timezone?: string;
}) {
  return mutate((doc) => updateProfile(doc, input));
}

export async function sealPlanAction() {
  return mutate((doc) => sealPlan(doc));
}

/* ------------------------------------------------------------ shared views -- */

/** Keyholder-scoped read: no balances, assets, recipient names or shares. */
export async function getKeyholderView() {
  const doc = await sharedDoc("keyholder");
  if (!doc) return null;
  if (settle(doc)) {
    const driver = await getDriver();
    const ownerId = await sharedOwner("keyholder");
    if (ownerId) await driver.save(ownerId, doc);
  }
  const view = keyholderView(doc);
  /*
   * Hand the code over only to the person who signed in with the address the
   * owner named. Anyone else holding the link sees everything about the plan
   * except the one secret that turns a link into a claim.
   */
  const user = await currentUser();
  const named = !!user && !!doc.keyholder && user.email.toLowerCase() === doc.keyholder.email.toLowerCase();
  if (view.keyholder && !named) view.keyholder = { ...view.keyholder, accessCode: null };
  return view;
}

/** Beneficiary-scoped read: only their own entitlement, and only after release. */
export async function getBeneficiaryView() {
  const doc = await sharedDoc("beneficiary");
  if (!doc) return null;
  if (settle(doc)) {
    const driver = await getDriver();
    const ownerId = await sharedOwner("beneficiary");
    if (ownerId) await driver.save(ownerId, doc);
  }
  return beneficiaryView(doc);
}

/* ------------------------------------------------------- paypal release -- */

export interface ReleaseRow {
  beneficiaryId: number;
  name: string;
  email: string;
  role: string;
  share: number;
  amountCents: number;
}

export interface ReleaseLedger {
  claimId: number;
  distributedAt: string;
  totalCents: number;
  rows: ReleaseRow[];
}

/**
 * What a completed handover owes each recipient, joined to the email PayPal
 * needs. Returns null until the 14-day window has actually closed — the payout
 * run cannot be started early by calling the API directly.
 */
export async function getReleaseLedger(): Promise<ReleaseLedger | null> {
  const driver = await getDriver();
  const { ownerId, doc } = await ownerDoc();
  if (settle(doc)) await driver.save(ownerId, doc);

  const claim = latestClaim(doc);
  if (!claim || claim.status !== "distributed" || !claim.distributedAt) return null;

  const rows: ReleaseRow[] = doc.distributions
    .filter((d) => d.claimId === claim.id)
    .map((d) => {
      const person = doc.beneficiaries.find((b) => b.id === d.beneficiaryId);
      return {
        beneficiaryId: d.beneficiaryId,
        name: person?.name ?? "Unknown recipient",
        email: person?.email ?? "",
        role: person?.role ?? "primary",
        share: d.share,
        amountCents: d.amountCents,
      };
    })
    .filter((row) => Boolean(row.email));

  return {
    claimId: claim.id,
    distributedAt: claim.distributedAt,
    totalCents: rows.reduce((sum, row) => sum + row.amountCents, 0),
    rows,
  };
}

/* ------------------------------------------------------------- stash & saves */

export async function createPotAction(input: PotInput) {
  return mutate((doc) => createPot(doc, input));
}

export async function allocateAction(potId: number, amountCents: number, direction: "to" | "from") {
  return mutate((doc) => allocateToPot(doc, potId, amountCents, direction));
}

export async function recordMoveAction(input: MoveInput) {
  return mutate((doc) => recordMove(doc, input));
}

/* ------------------------------------------------------------ vault + keys -- */

export interface OpenVaultResult {
  ok: boolean;
  error?: string;
  vault: Vault | null;
  firstBeneficiary: { id: number; name: string; email: string } | null;
  /** Returned exactly once, so the caller can email it. Never stored in clear. */
  key: string | null;
}

/**
 * The vault is the last thing that happens, not the first. It opens only when
 * the six steps are done, and the key goes to the first choice who is already
 * named on the plan.
 */
export async function openVaultAction(): Promise<OpenVaultResult & { snapshot: Snapshot }> {
  let issueKey: string | null = null;

  const result = await mutate((doc) => {
    const opened = openVault(doc);
    if (!opened.ok || !opened.vault) return { ok: false, error: opened.error };

    const primary = doc.beneficiaries.find((b) => b.role === "primary");
    if (primary) {
      issueKey = mintVaultKey(opened.vault.ref);
      markKeySent(doc, primary.email, hashVaultKey(issueKey));
    }
    return { ok: true };
  });

  const primary = result.snapshot.beneficiaries.find((b) => b.role === "primary") ?? null;
  return {
    ...result,
    vault: result.snapshot.vault,
    firstBeneficiary: primary ? { id: primary.id, name: primary.name, email: primary.email } : null,
    key: issueKey,
    snapshot: result.snapshot,
  };
}

export async function setKeyholderAction(input: { name: string; email: string; relationship: string }) {
  return mutate((doc) => setKeyholder(doc, input));
}

export async function markKeySentAction(email: string) {
  return mutate((doc) => {
    if (!doc.vault) return { ok: false, error: "This plan has no vault yet." };
    markKeySent(doc, email);
    return { ok: true };
  });
}

export interface BeneficiaryPlan {
  ownerId: string;
  ownerName: string;
  vault: Vault | null;
  role: "primary" | "backup" | "charity";
  share: number;
  valueCents: number;
  assets: { label: string; kind: string }[];
  request: ReleaseRequest | null;
}

/**
 * "Whose plan names me?" — every plan, filtered to the ones where this email is
 * a beneficiary. Only the fields a named person may see are copied out: their
 * own role and share, the vault's state, and the assets that would come to
 * them. Nothing about the owner's other beneficiaries leaves this function.
 */
export async function plansForBeneficiary(email: string): Promise<BeneficiaryPlan[]> {
  const driver = await getDriver();
  const needle = email.trim().toLowerCase();
  if (!needle || !driver.scan) return [];

  const rows = await driver.scan();
  const out: BeneficiaryPlan[] = [];

  for (const { key, doc } of rows) {
    const mine = doc.beneficiaries?.find((b) => b.email.trim().toLowerCase() === needle);
    if (!mine || doc.user.email.trim().toLowerCase() === needle) continue;

    const requests = [...(doc.releaseRequests ?? [])].sort((a, b) => b.id - a.id);
    out.push({
      ownerId: key,
      ownerName: doc.user.name || "A PayHalo member",
      vault: doc.vault ?? null,
      role: mine.role,
      share: mine.share,
      valueCents: Math.round((vaultBalanceCents(doc) * mine.share) / 100),
      assets: doc.assets.map((a) => ({ label: a.label, kind: a.kind })),
      request: requests[0] ?? null,
    });
  }

  return out;
}

/**
 * A named beneficiary asks for the vault to be opened. This is the only write
 * one account can make into another account's plan, and it is refused unless
 * the signed-in email is written on that plan.
 */
export async function requestReleaseAsBeneficiary(ownerId: string, key: string, note: string) {
  const user = await requireOwner();
  const driver = await getDriver();
  const doc = await driver.load(ownerId);
  if (!doc) return { ok: false, error: "That plan no longer exists." };

  const mine = doc.beneficiaries.find((b) => b.email.trim().toLowerCase() === user.email.trim().toLowerCase());
  if (!mine) return { ok: false, error: "This plan does not name you." };

  if (doc.vault?.keyHash && !vaultKeyMatches(key, doc.vault.keyHash)) {
    return { ok: false, error: "That is not the key for this plan." };
  }

  const result = requestRelease(doc, {
    requestedBy: "beneficiary",
    requesterName: user.name,
    requesterEmail: user.email,
    beneficiaryId: mine.id,
    note,
  });
  if (result.ok) await driver.save(ownerId, doc);
  return result;
}

export interface ReleaseEvidence {
  documentName: string;
  kind: string;
  confidence: number;
  verifiedAt: string | null;
  reviewEndsAt: string | null;
  ownerNotified: boolean;
  windowClosed: boolean;
}

export interface ReleaseQueueRow {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  vault: Vault | null;
  valueCents: number;
  request: ReleaseRequest;
  beneficiaries: { name: string; email: string; share: number }[];
  /** What Halo reads before an operator decides: the death documentation on file. */
  evidence: ReleaseEvidence | null;
}

/** The operator queue: every undecided release request, newest first. */
export async function releaseQueue(): Promise<ReleaseQueueRow[]> {
  const driver = await getDriver();
  if (!driver.scan) return [];

  const rows = await driver.scan();
  const out: ReleaseQueueRow[] = [];

  for (const { key, doc } of rows) {
    // the newest claim on the plan is the documentation this request rests on
    const claim = [...(doc.claims ?? [])].sort((a, b) => (a.initiatedAt < b.initiatedAt ? 1 : -1))[0] ?? null;
    const evidence: ReleaseEvidence | null = claim
      ? {
          documentName: claim.documentName,
          kind: claim.documentKind,
          confidence: claim.confidence,
          verifiedAt: claim.verifiedAt,
          reviewEndsAt: claim.reviewEndsAt,
          ownerNotified: ["window", "distributed"].includes(claim.status),
          windowClosed: Boolean(claim.windowEndsAt && Date.parse(claim.windowEndsAt) <= Date.now()),
        }
      : null;

    for (const request of doc.releaseRequests ?? []) {
      if (request.status === "approved") continue;
      out.push({
        evidence,
        ownerId: key,
        ownerName: doc.user.name || "Unnamed member",
        ownerEmail: doc.user.email,
        vault: doc.vault ?? null,
        valueCents: vaultBalanceCents(doc),
        request,
        beneficiaries: doc.beneficiaries.map((b) => ({ name: b.name, email: b.email, share: b.share })),
      });
    }
  }

  return out.sort((a, b) => (a.request.createdAt < b.request.createdAt ? 1 : -1));
}

/** An operator's decision. The only route to a released vault. */
export async function decideReleaseAction(
  ownerId: string,
  requestId: number,
  decision: "researching" | "approved" | "rejected",
  note: string,
  operator: string,
) {
  const driver = await getDriver();
  const doc = await driver.load(ownerId);
  if (!doc) return { ok: false, error: "That plan no longer exists." };
  const result = decideRelease(doc, requestId, decision, note, operator);
  if (result.ok) await driver.save(ownerId, doc);
  return result;
}

/* ------------------------------------------------------------- drafted plan -- */

/**
 * Writes a drafted plan into the document. Everything still goes through
 * addBeneficiary/addAsset, so the same rules apply as if it had been typed by
 * hand: one first choice, validated amounts, no invented emails.
 */
export async function applyDraftAction(draft: Draft) {
  return mutate((doc) => {
    let addedPeople = 0;
    let addedAssets = 0;
    const skipped: string[] = [];

    const hasPrimary = doc.beneficiaries.some((b) => b.role === "primary");
    let primaryUsed = hasPrimary;

    for (const person of draft.people) {
      if (doc.beneficiaries.some((b) => b.name.trim().toLowerCase() === person.name.trim().toLowerCase())) {
        skipped.push(person.name);
        continue;
      }
      const role: "primary" | "backup" = primaryUsed ? "backup" : "primary";
      const result = addBeneficiary(doc, {
        name: person.name,
        email: "",
        relationship: person.relationship,
        role,
        share: person.share,
        note: "Drafted from your own description",
      });
      if (result.ok) {
        addedPeople += 1;
        if (role === "primary") primaryUsed = true;
      } else {
        skipped.push(person.name);
      }
    }

    for (const asset of draft.assets) {
      if (doc.assets.some((a) => a.label.trim().toLowerCase() === asset.label.trim().toLowerCase())) {
        skipped.push(asset.label);
        continue;
      }
      const result = addAsset(doc, {
        kind: asset.kind,
        label: asset.label,
        provider: asset.provider,
        balanceCents: asset.balanceCents,
        detail: "Added from your own description",
      });
      if (result.ok) addedAssets += 1;
      else skipped.push(asset.label);
    }

    return { ok: true, extra: { addedPeople, addedAssets, skipped } };
  });
}
