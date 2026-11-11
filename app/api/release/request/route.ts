import { NextResponse } from "next/server";
import { requestReleaseAsBeneficiary } from "@/lib/store";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";

/** POST /api/release/request — a named beneficiary asks for the vault. */
async function handlePOST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) {
        return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
    }
  }

  const body = (await request.json().catch(() => null)) as
    | { ownerId?: unknown; key?: unknown; note?: unknown }
    | null;

  const ownerId = typeof body?.ownerId === "string" ? body.ownerId : "";
  const key = typeof body?.key === "string" ? body.key : "";
  const note = typeof body?.note === "string" ? body.note : "";

  if (!ownerId) return NextResponse.json({ error: "Which plan?" }, { status: 400 });
  if (!key.trim()) return NextResponse.json({ error: "Enter the key you were sent." }, { status: 400 });

  const result = await requestReleaseAsBeneficiary(ownerId, key, note);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, ref: result.ref });
}

export const POST = guarded(handlePOST);
