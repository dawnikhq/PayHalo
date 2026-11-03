import { NextResponse } from "next/server";
import { cancelClaimAction } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await cancelClaimAction();
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
