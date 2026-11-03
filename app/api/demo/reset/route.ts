import { NextResponse } from "next/server";
import { resetDemo } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const snapshot = await resetDemo();
  return NextResponse.json({ ok: true, snapshot });
}
