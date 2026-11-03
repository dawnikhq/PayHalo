import { NextResponse } from "next/server";
import { fastForwardAction } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await fastForwardAction();
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
