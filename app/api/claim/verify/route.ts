import { NextResponse } from "next/server";
import { verifyClaimAction } from "@/lib/store";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";

async function handlePOST() {
  const result = await verifyClaimAction();
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}

export const POST = guarded(handlePOST);
