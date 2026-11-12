import { NextResponse } from "next/server";
import { sealPlanAction } from "@/lib/store";
import { guarded } from "@/lib/route-guard";
import { notifyKeyholder } from "@/lib/keyholder-mail";

export const dynamic = "force-dynamic";

/**
 * POST /api/plan — seal the arrangement.
 *
 * Sealing is the moment a plan becomes real, so it is also the moment the
 * Trusted Key hears about it. The message carries no access code: if the person
 * already has a PayHalo account they are sent to their portal, and if they do
 * not, they are sent to sign up with the address that was named — the code is
 * then waiting inside the portal rather than sitting in an inbox.
 *
 * A failed email never undoes a sealed plan. The screen is told, so it can offer
 * to send again, but the seal itself stands.
 */
async function handlePOST(request: Request) {
  const result = await sealPlanAction();
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  const notice = await notifyKeyholder(new URL(request.url).origin, {
    ownerName: result.snapshot.user.name,
    keyholder: result.snapshot.keyholder,
  });

  return NextResponse.json({ ...result, keyholderMail: notice });
}

export const POST = guarded(handlePOST);
