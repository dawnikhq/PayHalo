import { NextResponse } from "next/server";
import { decideReleaseAction } from "@/lib/store";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/release — the operator's decision.
 *
 * There is no amount and no destination in this payload, by design: approval
 * can only release a plan to the beneficiaries that plan already names.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Operator sign-in required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { ownerId?: unknown; requestId?: unknown; decision?: unknown; note?: unknown }
    | null;

  const ownerId = typeof body?.ownerId === "string" ? body.ownerId : "";
  const requestId = Number(body?.requestId);
  const decision = body?.decision;
  const note = typeof body?.note === "string" ? body.note : "";

  if (!ownerId || !Number.isFinite(requestId)) {
    return NextResponse.json({ error: "Which request?" }, { status: 400 });
  }
  if (decision !== "researching" && decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "Unknown decision." }, { status: 400 });
  }

  const result = await decideReleaseAction(ownerId, requestId, decision, note, "Operator");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, decision });
}
