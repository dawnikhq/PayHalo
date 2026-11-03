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
  type PlanInput,
  type StateDoc,
} from "./model";
import type { Snapshot } from "./types";

export { SAFETY_WINDOW_DAYS } from "./model";
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

/** Read the world, settling any expired safety window first. */
export async function getSnapshot(): Promise<Snapshot> {
  const driver = await getDriver();
  const doc = await loadDoc();
  if (settle(doc)) await driver.save(doc);
  return { ...snapshotOf(doc), storage: driver.kind };
}

async function mutate(fn: (doc: StateDoc) => MutationResult): Promise<
  MutationResult & { snapshot: Snapshot }
> {
  const driver = await getDriver();
  const doc = await loadDoc();
  const result = fn(doc);
  if (result.ok) await driver.save(doc);
  return { ...result, snapshot: { ...snapshotOf(doc), storage: driver.kind } };
}

export async function savePlan(input: PlanInput): Promise<Snapshot> {
  const driver = await getDriver();
  const doc = applyPlan(input);
  await driver.save(doc);
  return { ...snapshotOf(doc), storage: driver.kind };
}

export async function submitClaimAction(
  accessCode: string,
  documentName: string,
): Promise<MutationResult & { snapshot: Snapshot }> {
  return mutate((doc) => submitClaim(doc, accessCode, documentName));
}

export async function verifyClaimAction() {
  return mutate((doc) => verifyClaim(doc));
}

export async function cancelClaimAction() {
  return mutate((doc) => cancelClaim(doc));
}

export async function fastForwardAction() {
  return mutate((doc) => {
    const result = fastForward(doc);
    return result;
  });
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
