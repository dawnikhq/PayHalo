import { NextResponse } from "next/server";
import { fastForwardWindow, getSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = fastForwardWindow();
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ ...result, snapshot: getSnapshot() });
}
