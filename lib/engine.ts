import type { Beneficiary, Role } from "./types";

export interface Allocation {
  beneficiaryId: number;
  name: string;
  role: Role;
  share: number;
  amountCents: number;
}

/**
 * The Automation Engine's core rule.
 *
 * 1. The primary beneficiary inherits, if they can be reached.
 * 2. If not, the available backups split the estate by their weighting.
 * 3. If nobody is left, the designated charity takes everything.
 */
export function allocate(beneficiaries: Beneficiary[], totalCents: number): Allocation[] {
  const primary = beneficiaries.filter((b) => b.role === "primary" && b.available);
  const backups = beneficiaries.filter((b) => b.role === "backup" && b.available);
  const charity = beneficiaries.filter((b) => b.role === "charity");

  const pool = primary.length ? primary : backups.length ? backups : charity;
  if (!pool.length || totalCents <= 0) return [];

  const weightSum = pool.reduce((s, b) => s + (b.share || 0), 0) || pool.length;

  let remaining = totalCents;
  return pool.map((b, index) => {
    const isLast = index === pool.length - 1;
    const amount = isLast
      ? remaining
      : Math.floor((totalCents * (b.share || 1)) / weightSum);
    remaining -= amount;
    return {
      beneficiaryId: b.id,
      name: b.name,
      role: b.role,
      share: Math.round(((b.share || 1) / weightSum) * 100),
      amountCents: amount,
    };
  });
}

export function totalOf(assets: { balanceCents: number }[]): number {
  return assets.reduce((s, a) => s + a.balanceCents, 0);
}
