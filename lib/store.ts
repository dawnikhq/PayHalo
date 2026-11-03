import { getDb } from "./db";
import { executeDistribution, totalOf } from "./engine";
import { mockExtract, type OcrResult } from "./ocr";
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

const nowIso = () => new Date().toISOString();

/**
 * node:sqlite hands back null-prototype objects, which React refuses to pass
 * from a Server Component to a Client Component. Normalise everything to
 * plain objects at the boundary.
 */
function plain<T>(row: unknown): T {
  return { ...(row as object) } as T;
}

function one<T>(sql: string, ...params: (string | number | bigint | null)[]): T | null {
  const row = getDb().prepare(sql).get(...params);
  return row === undefined || row === null ? null : plain<T>(row);
}

function all<T>(sql: string, ...params: (string | number | bigint | null)[]): T[] {
  return getDb().prepare(sql).all(...params).map((row) => plain<T>(row));
}

export function getUser(): User {
  return one<User>("SELECT id, name, email FROM user ORDER BY id LIMIT 1")!;
}

export function getPlan(): Plan {
  const row = one<{
    id: number;
    user_id: number;
    status: Plan["status"];
    sealed_at: string | null;
    updated_at: string;
  }>("SELECT * FROM plan ORDER BY id DESC LIMIT 1")!;
  return { id: row.id, userId: row.user_id, status: row.status, sealedAt: row.sealed_at, updatedAt: row.updated_at };
}

export function getAssets(): Asset[] {
  return all<Asset>("SELECT id, user_id AS userId, kind, label, provider, balance_cents AS balanceCents, detail, connected FROM asset ORDER BY id");
}

export function getBeneficiaries(): Beneficiary[] {
  return all<Beneficiary>(
    `SELECT id, user_id AS userId, name, email, relationship, role, share, sort, available, note
     FROM beneficiary ORDER BY role = 'primary' DESC, role = 'charity' ASC, sort, id`,
  );
}

export function getKeyholder(): Keyholder | null {
  const row = one<{
    id: number;
    user_id: number;
    name: string;
    email: string;
    relationship: string;
    access_code: string;
  }>("SELECT * FROM keyholder ORDER BY id LIMIT 1");
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    relationship: row.relationship,
    accessCode: row.access_code,
  };
}

export function getClaim(): Claim | null {
  const row = one<{
    id: number;
    plan_id: number;
    keyholder_id: number;
    status: Claim["status"];
    document_name: string;
    extracted: string;
    confidence: number;
    initiated_at: string;
    verified_at: string | null;
    window_ends_at: string | null;
    distributed_at: string | null;
  }>("SELECT * FROM claim ORDER BY id DESC LIMIT 1");
  if (!row) return null;
  return {
    id: row.id,
    planId: row.plan_id,
    keyholderId: row.keyholder_id,
    status: row.status,
    documentName: row.document_name,
    extracted: row.extracted,
    confidence: row.confidence,
    initiatedAt: row.initiated_at,
    verifiedAt: row.verified_at,
    windowEndsAt: row.window_ends_at,
    distributedAt: row.distributed_at,
  };
}

export function getDistributions(claimId: number) {
  return all<Distribution & { name: string; role: Role }>(
    `SELECT d.id, d.claim_id AS claimId, d.beneficiary_id AS beneficiaryId, d.amount_cents AS amountCents,
            d.share, d.status, d.created_at AS createdAt, b.name, b.role
     FROM distribution d JOIN beneficiary b ON b.id = d.beneficiary_id
     WHERE d.claim_id = ? ORDER BY d.amount_cents DESC`,
    claimId,
  );
}

export function getEvents(planId: number, limit = 12): EventRow[] {
  return all<EventRow>(
    `SELECT id, plan_id AS planId, type, title, body, created_at AS createdAt
     FROM event WHERE plan_id = ? ORDER BY id DESC LIMIT ?`,
    planId,
    limit,
  );
}

function addEvent(planId: number, type: string, title: string, body = "") {
  getDb()
    .prepare("INSERT INTO event (plan_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(planId, type, title, body, nowIso());
}

/**
 * Runs on every read: if a verified claim's safety window has elapsed,
 * the Automation Engine executes the stored instructions right now.
 */
export function settleIfDue(): void {
  const claim = getClaim();
  if (!claim || claim.status !== "window" || !claim.windowEndsAt) return;
  if (new Date(claim.windowEndsAt).getTime() > Date.now()) return;

  const plan = getPlan();
  const beneficiaries = getBeneficiaries();
  const total = totalOf(getAssets());

  executeDistribution(getDb(), claim, plan, beneficiaries, total);
}

export function getSnapshot(): Snapshot {
  settleIfDue();

  const plan = getPlan();
  const claim = getClaim();
  const secondsToWindowEnd =
    claim && claim.status === "window" && claim.windowEndsAt
      ? Math.max(0, Math.floor((new Date(claim.windowEndsAt).getTime() - Date.now()) / 1000))
      : null;

  return {
    user: getUser(),
    plan,
    assets: getAssets(),
    beneficiaries: getBeneficiaries(),
    keyholder: getKeyholder(),
    claim,
    distributions: claim ? getDistributions(claim.id) : [],
    events: getEvents(plan.id),
    totalCents: totalOf(getAssets()),
    secondsToWindowEnd,
  };
}

/* ------------------------------- mutations ------------------------------- */

export function savePlan(input: {
  name: string;
  email: string;
  assets: { kind: string; label: string; provider: string; balanceCents: number; detail: string }[];
  primary: { name: string; email: string; relationship: string; note: string };
  backups: { name: string; email: string; relationship: string; share: number; note: string }[];
  charity: { name: string; email: string; note: string };
  keyholder: { name: string; email: string; relationship: string; accessCode: string };
}) {
  const db = getDb();
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM distribution; DELETE FROM claim; DELETE FROM event; DELETE FROM beneficiary; DELETE FROM keyholder; DELETE FROM asset; DELETE FROM plan; DELETE FROM user;");
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('distribution','claim','event','beneficiary','keyholder','asset','plan','user');");

    const stamp = nowIso();
    const userId = Number(
      db.prepare("INSERT INTO user (name, email) VALUES (?, ?)").run(input.name, input.email).lastInsertRowid,
    );
    const planId = Number(
      db.prepare("INSERT INTO plan (user_id, status, sealed_at, updated_at) VALUES (?, 'active', ?, ?)").run(userId, stamp, stamp)
        .lastInsertRowid,
    );

    const insertAsset = db.prepare(
      "INSERT INTO asset (user_id, kind, label, provider, balance_cents, detail, connected) VALUES (?, ?, ?, ?, ?, ?, 1)",
    );
    for (const a of input.assets) {
      insertAsset.run(userId, a.kind, a.label, a.provider, a.balanceCents, a.detail);
    }

    const insertBen = db.prepare(
      "INSERT INTO beneficiary (user_id, name, email, relationship, role, share, sort, available, note) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)",
    );
    insertBen.run(userId, input.primary.name, input.primary.email, input.primary.relationship, "primary", 100, 0, input.primary.note);
    input.backups.forEach((b, i) => {
      insertBen.run(userId, b.name, b.email, b.relationship, "backup", b.share, i + 1, b.note);
    });
    insertBen.run(userId, input.charity.name, input.charity.email, "Charity", "charity", 100, 90, input.charity.note);

    db.prepare(
      "INSERT INTO keyholder (user_id, name, email, relationship, access_code) VALUES (?, ?, ?, ?, ?)",
    ).run(userId, input.keyholder.name, input.keyholder.email, input.keyholder.relationship, input.keyholder.accessCode);

    addEvent(planId, "plan.sealed", "Plan sealed", `${input.name} sealed a plan covering ${input.assets.length} accounts and ${2 + input.backups.length} recipients.`);
    db.exec("COMMIT");
    return { ok: true, planId };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function submitClaim(accessCode: string, documentName: string): { ok: boolean; error?: string } {
  const keyholder = getKeyholder();
  if (!keyholder) return { ok: false, error: "No keyholder on file." };
  if (accessCode.trim().toUpperCase() !== keyholder.accessCode.toUpperCase()) {
    return { ok: false, error: "That access code doesn't match the keyholder on file." };
  }
  const existing = getClaim();
  if (existing && existing.status !== "cancelled") {
    return { ok: false, error: "A handover is already in progress." };
  }

  const user = getUser();
  const plan = getPlan();
  const ocr: OcrResult = mockExtract(documentName || "death-certificate.pdf", user.name);

  const claimId = Number(
    getDb()
      .prepare(
        `INSERT INTO claim (plan_id, keyholder_id, status, document_name, extracted, confidence, initiated_at)
         VALUES (?, ?, 'verifying', ?, ?, ?, ?)`,
      )
      .run(plan.id, keyholder.id, ocr.documentName, JSON.stringify(ocr.fields), ocr.confidence, nowIso()).lastInsertRowid,
  );

  addEvent(
    plan.id,
    "claim.submitted",
    "Keyholder submitted a certificate",
    `${keyholder.name} uploaded ${ocr.documentName}. ${Math.round(ocr.confidence * 100)}% extraction confidence. Claim #${claimId}.`,
  );
  return { ok: true };
}

export function verifyClaim(): { ok: boolean; error?: string } {
  const claim = getClaim();
  if (!claim) return { ok: false, error: "No claim submitted." };
  if (claim.status !== "verifying") return { ok: false, error: "Claim is not awaiting verification." };

  const plan = getPlan();
  const windowEnd = new Date(Date.now() + SAFETY_WINDOW_DAYS * 86_400_000).toISOString();

  getDb()
    .prepare("UPDATE claim SET status = 'window', verified_at = ?, window_ends_at = ? WHERE id = ?")
    .run(nowIso(), windowEnd, claim.id);
  getDb().prepare("UPDATE plan SET status = 'claiming', updated_at = ? WHERE id = ?").run(nowIso(), plan.id);

  addEvent(
    plan.id,
    "claim.verified",
    "Certificate verified",
    `Owner notified. ${SAFETY_WINDOW_DAYS}-day safety window opened — no transfer can happen before it closes.`,
  );
  return { ok: true };
}

export function cancelClaim(): { ok: boolean; error?: string } {
  const claim = getClaim();
  if (!claim || claim.status !== "window") return { ok: false, error: "There is no open safety window." };
  const plan = getPlan();

  getDb().prepare("UPDATE claim SET status = 'cancelled' WHERE id = ?").run(claim.id);
  getDb().prepare("UPDATE plan SET status = 'active', updated_at = ? WHERE id = ?").run(nowIso(), plan.id);
  addEvent(plan.id, "window.cancelled", "Owner stopped the handover", "The owner responded inside the safety window. Nothing was transferred.");
  return { ok: true };
}

export function fastForwardWindow(): { ok: boolean; error?: string } {
  const claim = getClaim();
  if (!claim || claim.status !== "window") return { ok: false, error: "There is no open safety window." };
  getDb().prepare("UPDATE claim SET window_ends_at = ? WHERE id = ?").run(nowIso(), claim.id);
  addEvent(getPlan().id, "window.elapsed", "Safety window elapsed", "14 days passed with no response from the owner. Handover due.");
  settleIfDue();
  return { ok: true };
}

export function setAvailability(beneficiaryId: number, available: boolean): { ok: boolean } {
  const plan = getPlan();
  getDb().prepare("UPDATE beneficiary SET available = ? WHERE id = ?").run(available ? 1 : 0, beneficiaryId);
  const ben = one<{ name: string; role: string }>("SELECT name, role FROM beneficiary WHERE id = ?", beneficiaryId);
  addEvent(
    plan.id,
    "beneficiary.availability",
    available ? `${ben?.name} reachable again` : `${ben?.name} marked unreachable`,
    available
      ? "The engine can route assets to this recipient again."
      : "The engine will fall through to the next instruction if a handover runs.",
  );
  return { ok: true };
}
