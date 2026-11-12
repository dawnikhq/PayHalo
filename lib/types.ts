export type Role = "primary" | "backup" | "charity";
export type AssetKind = "paypal" | "crypto" | "business";
export type PlanStatus = "draft" | "active" | "claiming" | "distributed";
/**
 * review      → the document is in the 72-hour registry check; the owner has NOT been notified
 * window      → the check cleared, the owner was notified, the 14-day safety window is running
 * cancelled   → the owner answered inside the window; nothing moved
 * distributed → the window closed and the engine paid out
 */
export type ClaimStatus = "review" | "window" | "cancelled" | "distributed" | "rejected";

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

/**
 * A "save" — money set aside for one named purpose. The balance itself stays in
 * the PayPal account; this records what that money is for and who inherits it.
 */
export interface Pot {
  id: number;
  name: string;
  /** The answer to "what is this money for?" */
  purpose: string;
  targetCents: number;
  allocatedCents: number;
  beneficiaryId: number | null;
  createdAt: string;
}

export type MoneyMoveKind = "in" | "out" | "to-pot" | "from-pot";

export interface MoneyMove {
  id: number;
  kind: MoneyMoveKind;
  amountCents: number;
  potId: number | null;
  counterparty: string | null;
  note: string;
  status: "recorded" | "pending" | "failed";
  providerId: string | null;
  createdAt: string;
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
  /** What the owner calls this arrangement — "Family", "The studio", … */
  name?: string;
  createdAt?: string;
}

/** The five things the My Plan checklist counts. */
export interface PlanStep {
  key: "first_choice" | "assets" | "backups" | "charity" | "keyholder" | "review";
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
  /** JSON array of `{ id, label }` — the assets this claim asks about. */
  assetRefs?: string | null;
  /** The keyholder's own words, kept for the operator's review. */
  note?: string | null;
  /** Why the operator accepted or refused the documents. */
  decisionNote?: string | null;
  decidedAt?: string | null;
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

/**
 * A PayPal account a visitor connected with "Log in with PayPal". Identity is
 * app-wide; the token stays server-side and is never serialised to a page.
 */
export interface PayPalConnection {
  /** Opaque browser id from the httpOnly cookie — one connection per visitor. */
  sid: string;
  payerId: string;
  email: string;
  name: string | null;
  mode: "sandbox" | "live";
  accessToken: string;
  scope: string | null;
  connectedAt: string;
  expiresAt: string | null;
}

/** One recipient of one release. `sent` rows carry PayPal's own batch id. */
export interface PayPalPayout {
  id: number;
  claimId: number;
  beneficiaryId: number | null;
  email: string;
  amountCents: number;
  currency: string;
  status: string;
  batchId: string | null;
  mode: "sandbox" | "live";
  error: string | null;
  createdAt: string;
}

export interface PayPalState {
  connections: PayPalConnection[];
  payouts: PayPalPayout[];
}


/**
 * The vault. One per plan.
 *
 * Money moves in through PayPal and can only ever leave one way: a release
 * that pays the beneficiaries the plan already names, after an operator has
 * confirmed the death documentation. There is deliberately no "withdraw"
 * shape in this type, so no screen and no endpoint can invent one.
 */
export type VaultStatus = "open" | "frozen" | "released";

export interface Vault {
  /** Short human reference, e.g. PH-2-A1B2C3. */
  ref: string;
  openedAt: string;
  status: VaultStatus;
  /** When the one-time key was emailed to the first beneficiary. */
  keySentAt: string | null;
  keyTo: string | null;
  /** SHA-256 of the key that went to the first beneficiary. Never the key. */
  keyHash: string | null;
  releasedAt: string | null;
  /** Reference the operator's approval produced. */
  releaseRef: string | null;
}

export type ReleaseStatus = "pending" | "researching" | "approved" | "rejected";

/**
 * A request that the vault be opened. A beneficiary or keyholder raises it;
 * an operator researches the death documentation and decides. Approval is the
 * only thing that can set the vault to released.
 */
export interface ReleaseRequest {
  id: number;
  ref: string;
  requestedBy: "beneficiary" | "keyholder" | "owner";
  requesterName: string;
  requesterEmail: string;
  beneficiaryId: number | null;
  note: string;
  status: ReleaseStatus;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  adminNote: string;
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
  /** Money moved into PayHalo and not yet set aside in a save. */
  stashCents: number;
  pots: Pot[];
  moves: MoneyMove[];
  vault: Vault | null;
  releaseRequests: ReleaseRequest[];
  secondsToReviewEnd: number | null;
  secondsToWindowEnd: number | null;
  /** Which persistence driver served this state. */
  storage: "supabase" | "kv" | "sqlite" | "memory";
}
