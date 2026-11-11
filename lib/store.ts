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
  updateProfile,
  keyholderView,
  verifyClaim,
  type AssetInput,
  type Audience,
  type BeneficiaryInput,
  type MoveInput,
  type PlanInput,
  type PotInput,
  type StateDoc,
} from "./model";
import type { StoredReport } from "./certs";
import type { Snapshot } from "./types";
import { currentUser, requireOwner, sharedOwner } from "./scope";

export { SAFETY_WINDOW_DAYS, REVIEW_HOURS } from "./model";
export type { Audience } from "./model";
export type { PlanInput } from "./model";
export type { BeneficiaryView, KeyholderView } from "./model";

/**
 * Every read is scoped to one owner's document. The owner id is the auth user
 * id; a keyholder or beneficiary never gets an owner id — they present a signed
 * share link, and only the redacted view builders run against it.
 */

type MutationResult = { ok: boolean; error?: string };

async function loadDoc(ownerId: string, identity?: { name: string; email: string }): Promise<StateDoc> {
  const driver = await getDriver();
  const existing = await driver.load(ownerId);
  if (existing) return existing;
  return emptyDoc({ id: ownerId, name: identity?.name ?? "", email: identity?.email ?? "" });
}

/** Owner-scoped load: the signed-in account, or a fresh empty plan. */
async function ownerDoc(): Promise<{ ownerId: string; doc: StateDoc }> {
  const user = await requireOwner();
  return { ownerId: user.id, doc: await loadDoc(user.id, { name: user.name, email: user.email }) };
}

/**
 * The actor may be the signed-in owner or a keyholder holding a valid link.
 * Only the keyholder flow uses this: filing and verifying a claim.
 */
async function actorDoc(): Promise<{ ownerId: string; doc: StateDoc }> {
  const user = await currentUser();
  if (user) return { ownerId: user.id, doc: await loadDoc(user.id) };
  const shared = await sharedOwner("keyholder");
  if (shared) return { ownerId: shared, doc: await loadDoc(shared) };
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
  await driver.save(user.id, doc);
  return { ...snapshotOf(doc), storage: driver.kind };
}

/** Every document hash already filed on this plan — used to catch duplicates. */
export async function existingHashes(): Promise<string[]> {
  const { doc } = await ownerDoc();
  return doc.claims.map((c) => c.documentHash).filter(Boolean);
}

export async function submitClaimAction(
  accessCode: string,
  report: StoredReport,
): Promise<MutationResult & { snapshot: Snapshot }> {
  return mutate((doc) => submitClaim(doc, { accessCode, report }), "keyholder");
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
  return keyholderView(doc);
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
