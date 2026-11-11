import { NextResponse } from "next/server";
import { setKeyholderAction } from "@/lib/store";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";

/** POST /api/keyholder/plan — name the person who can open a claim. */
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
    | { name?: unknown; email?: unknown; relationship?: unknown }
    | null;

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Enter the name of your trusted person." }, { status: 400 });

  const result = await setKeyholderAction({
    name,
    email: typeof body?.email === "string" ? body.email.trim() : "",
    relationship: typeof body?.relationship === "string" ? body.relationship.trim() : "",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, keyholder: result.snapshot.keyholder });
}

export const POST = guarded(handlePOST);
