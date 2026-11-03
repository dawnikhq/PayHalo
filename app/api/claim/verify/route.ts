import { NextResponse } from "next/server";
import { verifyClaim, getSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = verifyClaim();
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ ...result, snapshot: getSnapshot() });
}
