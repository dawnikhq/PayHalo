export type Role = "primary" | "backup" | "charity";
export type AssetKind = "paypal" | "crypto" | "business";
export type PlanStatus = "draft" | "active" | "claiming" | "distributed";
/**
 * review      → the document is in the 72-hour registry check; the owner has NOT been notified
 * window      → the check cleared, the owner was notified, the 14-day safety window is running
 * cancelled   → the owner answered inside the window; nothing moved
 * distributed → the window closed and the engine paid out
 */
export type ClaimStatus = "review" | "window" | "cancelled" | "distributed";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  timezone?: string;
}

export interface Asset {
  id: number;
  userId: number;
  kind: AssetKind;
  label: string;
  provider: string;
  balanceCents: number;
  detail: string;
  connected: number;
  /** Where the account lives, for the handover instructions. */
  url?: string | null;
  /** What should be passed on. */
  handoverNote?: string | null;
  /** Free-text note, never a password or seed phrase. */
  accessNote?: string | null;
  /** Storefront metrics, only meaningful for a digital business. */
  monthlyCents?: number | null;
  customers?: number | null;
  /** Has the owner reviewed the recovery instructions for this asset? */
  reviewed?: number;
}

export interface DocumentRow {
  id: number;
  userId: number;
  name: string;
  kind: string;
  sizeKb: number;
  relatedTo: string;
  access: "owner" | "beneficiaries";
  updatedAt: string;
  createdAt: string;
}

export interface Beneficiary {
  id: number;
  userId: number;
  name: string;
  email: string;
  relationship: string;
  role: Role;
  share: number;
  sort: number;
  available: number;
  note: string;
}

export interface Keyholder {
  id: number;
  userId: number;
  name: string;
  email: string;
  relationship: string;
  accessCode: string;
}

export interface Plan {
  id: number;
  userId: number;
  status: PlanStatus;
  sealedAt: string | null;
  updatedAt: string;
}

/** The five things the My Plan checklist counts. */
export interface PlanStep {
  key: "assets" | "beneficiaries" | "charity" | "keyholder" | "review";
  label: string;
  done: boolean;
}

export interface ExtractedField {
  label: string;
  value: string;
  confidence: number;
}

export interface Claim {
  id: number;
  planId: number;
  keyholderId: number;
  status: ClaimStatus;
  documentName: string;
  /** SHA-256 of the submitted file — also the duplicate-submission key. */
  documentHash: string;
  documentKind: string; // pdf | png | jpeg
  extracted: string; // JSON array of ExtractedField
  /** JSON CertReport from lib/certs.ts — the full verification transcript. */
  verification: string;
  confidence: number;
  initiatedAt: string;
  /** 72 hours after submission: the registry check must clear before the owner is told. */
  reviewEndsAt: string | null;
  verifiedAt: string | null;
  windowEndsAt: string | null;
  distributedAt: string | null;
}

export interface Distribution {
  id: number;
  claimId: number;
  beneficiaryId: number;
  amountCents: number;
  share: number;
  status: string;
  createdAt: string;
}

export interface EventRow {
  id: number;
  planId: number;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  /** 0 = internal audit only (e.g. a claim the owner hasn't been notified about yet). */
  ownerVisible: number;
}

export interface Snapshot {
  user: User;
  plan: Plan;
  assets: Asset[];
  beneficiaries: Beneficiary[];
  keyholder: Keyholder | null;
  claim: Claim | null;
  distributions: (Distribution & { name: string; role: Role })[];
  documents: DocumentRow[];
  steps: PlanStep[];
  events: EventRow[];
  totalCents: number;
  secondsToReviewEnd: number | null;
  secondsToWindowEnd: number | null;
  /** Which persistence driver served this state. */
  storage: "supabase" | "kv" | "sqlite" | "memory";
}
