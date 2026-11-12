import { NextResponse } from "next/server";
import { setKeyholderAction } from "@/lib/store";
import { notifyKeyholder } from "@/lib/keyholder-mail";
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

  /*
   * A plan confirmed before the Trusted Key was named still owes that person an
   * introduction. Naming them later sends it now, so no plan can end up sealed
   * with someone who was never told.
   */
  let keyholderMail: Awaited<ReturnType<typeof notifyKeyholder>> | null = null;
  if (result.snapshot.plan.sealedAt && result.snapshot.keyholder?.email) {
    keyholderMail = await notifyKeyholder(new URL(request.url).origin, {
      ownerName: result.snapshot.user.name,
      keyholder: { name: result.snapshot.keyholder.name, email: result.snapshot.keyholder.email },
    });
  }

  return NextResponse.json({ ok: true, keyholder: result.snapshot.keyholder, keyholderMail });
}

export const POST = guarded(handlePOST);
