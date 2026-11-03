import { NextResponse } from "next/server";
import { setAvailability, getSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ ok: false, error: "Missing beneficiary id." }, { status: 400 });
  setAvailability(id, Boolean(body?.available));
  return NextResponse.json({ ok: true, snapshot: getSnapshot() });
}
