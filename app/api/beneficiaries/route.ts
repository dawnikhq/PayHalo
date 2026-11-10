import { NextResponse } from "next/server";
import {
  addBeneficiaryAction,
  removeBeneficiaryAction,
  setAllocationsAction,
  updateBeneficiaryAction,
} from "@/lib/store";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["primary", "backup", "charity"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const role = ROLES.includes(body?.role) ? (body.role as Role) : "backup";
  const result = await addBeneficiaryAction({
    name: String(body?.name ?? ""),
    email: String(body?.email ?? ""),
    relationship: String(body?.relationship ?? ""),
    role,
    share: body?.share !== undefined ? Number(body.share) : undefined,
    note: String(body?.note ?? ""),
  });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}

/**
 * Three shapes:
 *   { shares: [{id, share}] }        → rebalance the family backups
 *   { update: { id, name, … } }      → edit one person's details
 *   { remove: id }                   → take a backup off the plan
 */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (Array.isArray(body?.shares)) {
    const shares = body.shares.map((s: { id: unknown; share: unknown }) => ({
      id: Number(s.id),
      share: Number(s.share),
    }));
    const result = await setAllocationsAction(shares);
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  }

  if (body?.update) {
    const u = body.update;
    const result = await updateBeneficiaryAction(Number(u.id), {
      name: u.name !== undefined ? String(u.name) : undefined,
      email: u.email !== undefined ? String(u.email) : undefined,
      relationship: u.relationship !== undefined ? String(u.relationship) : undefined,
      note: u.note !== undefined ? String(u.note) : undefined,
      share: u.share !== undefined ? Number(u.share) : undefined,
    });
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  }

  const result = await removeBeneficiaryAction(Number(body?.remove));
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
