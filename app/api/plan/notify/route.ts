import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/store";
import { guarded } from "@/lib/route-guard";
import { notifyKeyholder } from "@/lib/keyholder-mail";

export const dynamic = "force-dynamic";

/**
 * POST /api/plan/notify — send the Trusted Key their introduction again.
 *
 * Mail fails for reasons that have nothing to do with the plan: a provider
 * outage, a sender not yet validated, a typo fixed a minute later. The owner can
 * therefore ask for the message again without touching the arrangements.
 */
async function handlePOST(request: Request) {
  const snapshot = await getSnapshot();
  if (!snapshot.keyholder) {
    return NextResponse.json({ ok: false, error: "Name a Trusted Key first." }, { status: 400 });
  }

  const notice = await notifyKeyholder(new URL(request.url).origin, {
    ownerName: snapshot.user.name,
    keyholder: { name: snapshot.keyholder.name, email: snapshot.keyholder.email },
  });

  return NextResponse.json({ ok: true, keyholderMail: notice });
}

export const POST = guarded(handlePOST);
