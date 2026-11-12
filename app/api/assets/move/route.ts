import { NextResponse } from "next/server";
import { moveAssetToPlanAction } from "@/lib/store";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/assets/move — send one asset record to another arrangement.
 *
 * Moving is a single write across two documents, done on the server so a plan
 * cannot end up with the asset in both places or in neither.
 */
async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { id?: unknown; toPlanNo?: unknown };
  const id = Number(body.id);
  const toPlanNo = Number(body.toPlanNo);

  if (!Number.isInteger(id)) {
    return NextResponse.json({ ok: false, error: "Missing asset." }, { status: 400 });
  }

  const result = await moveAssetToPlanAction(id, toPlanNo);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export const POST = guarded(handlePOST);
