import { getDriver } from "./storage";
import {
  applyPlan,
  cancelClaim,
  fastForward,
  latestClaim,
  seedDoc,
  setAvailability,
  settle,
  snapshotOf,
  submitClaim,
  verifyClaim,
  type Audience,
  type PlanInput,
  type StateDoc,
} from "./model";
import type { StoredReport } from "./certs";
import type { Snapshot } from "./types";

export { SAFETY_WINDOW_DAYS, REVIEW_HOURS } from "./model";
export type { Audience } from "./model";
export type { PlanInput } from "./model";

type MutationResult = { ok: boolean; error?: string };

async function loadDoc(): Promise<StateDoc> {
  const driver = await getDriver();
  const existing = await driver.load();
  if (existing) return existing;
  const seeded = seedDoc();
  await driver.save(seeded);
  return seeded;
}

async function withDoc(): Promise<{ doc: StateDoc; storage: Snapshot["storage"] }> {
  const driver = await getDriver();
  return { doc: await loadDoc(), storage: driver.kind };
}

/**
 * Read the world, moving any elapsed clock first (the 72-hour registry check,
 * then the 14-day window). The owner's view never includes events they haven't
 * been notified about yet.
 */
export async function getSnapshot(audience: Audience = "owner"): Promise<Snapshot> {
  const driver = await getDriver();
  const doc = await loadDoc();
  if (settle(doc)) await driver.save(doc);
  return { ...snapshotOf(doc, audience), storage: driver.kind };
}

async function mutate(
  fn: (doc: StateDoc) => MutationResult,
  audience: Audience = "owner",
): Promise<MutationResult & { snapshot: Snapshot }> {
  const driver = await getDriver();
  const doc = await loadDoc();
  if (settle(doc)) await driver.save(doc);
  const result = fn(doc);
  if (result.ok) await driver.save(doc);
  return { ...result, snapshot: { ...snapshotOf(doc, audience), storage: driver.kind } };
}

export async function savePlan(input: PlanInput): Promise<Snapshot> {
  const driver = await getDriver();
  const doc = applyPlan(input);
  await driver.save(doc);
  return { ...snapshotOf(doc), storage: driver.kind };
}

/** Every document hash already filed on this plan — used to catch duplicates. */
export async function existingHashes(): Promise<string[]> {
  const doc = await loadDoc();
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

export async function fastForwardAction() {
  return mutate((doc) => fastForward(doc), "keyholder");
}

export async function setAvailabilityAction(id: number, available: boolean) {
  return mutate((doc) => setAvailability(doc, id, available));
}

export async function resetDemo(): Promise<Snapshot> {
  const driver = await getDriver();
  const doc = seedDoc();
  await driver.save(doc);
  return { ...snapshotOf(doc), storage: driver.kind };
}

/**
 * Small convenience for the UI, and a real health check: it asks the driver
 * for the document so a misconfigured durable store is visible immediately
 * instead of failing on the first page load.
 */
export async function storageKind() {
  const driver = await getDriver();
  let ok = true;
  let error: string | undefined;
  try {
    await driver.load();
  } catch (e) {
    ok = false;
    error = e instanceof Error ? e.message : String(e);
  }
  return { kind: driver.kind, label: driver.label, durable: driver.durable, ok, error };
}

export { latestClaim };
