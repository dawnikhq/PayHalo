export type Role = "primary" | "backup" | "charity";
export type AssetKind = "paypal" | "crypto" | "business";
export type PlanStatus = "draft" | "active" | "claiming" | "distributed";
export type ClaimStatus =
  | "verifying"
  | "window"
  | "cancelled"
  | "distributed";

export interface User {
  id: number;
  name: string;
  email: string;
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
  extracted: string; // JSON array of ExtractedField
  confidence: number;
  initiatedAt: string;
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
}

export interface Snapshot {
  user: User;
  plan: Plan;
  assets: Asset[];
  beneficiaries: Beneficiary[];
  keyholder: Keyholder | null;
  claim: Claim | null;
  distributions: (Distribution & { name: string; role: Role })[];
  events: EventRow[];
  totalCents: number;
  secondsToWindowEnd: number | null;
  /** Which persistence driver served this state. */
  storage: "kv" | "sqlite" | "memory";
}
