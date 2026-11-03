import { NextResponse } from "next/server";
import { submitClaimAction } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await submitClaimAction(
    String(body?.accessCode ?? ""),
    String(body?.documentName ?? "death-certificate.pdf"),
  );
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
