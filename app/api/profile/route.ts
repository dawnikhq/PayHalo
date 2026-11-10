import { NextResponse } from "next/server";
import { updateProfileAction } from "@/lib/store";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";

async function handlePOST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await updateProfileAction({
    name: body?.name !== undefined ? String(body.name) : undefined,
    email: body?.email !== undefined ? String(body.email) : undefined,
    phone: body?.phone !== undefined ? String(body.phone) : undefined,
    timezone: body?.timezone !== undefined ? String(body.timezone) : undefined,
  });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}

export const POST = guarded(handlePOST);
