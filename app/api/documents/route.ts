import { NextResponse } from "next/server";
import { addDocumentAction } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const access = body?.access === "beneficiaries" ? "beneficiaries" : "owner";
  const result = await addDocumentAction({
    name: String(body?.name ?? ""),
    sizeKb: Math.round(Number(body?.sizeKb ?? 0)),
    relatedTo: String(body?.relatedTo ?? "My Plan"),
    access,
  });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
