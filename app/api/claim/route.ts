import { NextResponse } from "next/server";
import { submitClaim, getSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = submitClaim(String(body?.accessCode ?? ""), String(body?.documentName ?? "death-certificate.pdf"));
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ ...result, snapshot: getSnapshot() });
}
