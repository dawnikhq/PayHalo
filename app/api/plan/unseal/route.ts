import { NextResponse } from "next/server";
import { getSnapshot, unsealPlanAction } from "@/lib/store";
import { guarded } from "@/lib/route-guard";
import { notifyKeyholderUnsealed } from "@/lib/keyholder-mail";
import { mailConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";

/**
 * POST /api/plan/unseal — take the seal off so the plan can be changed.
 *
 * Sealing told the Trusted Key the instructions were fixed. Unsealing changes
 * that, so they are told again — but unlike sealing, a failed email does not
 * block it. A person who needs to correct their own plan must not be held
 * hostage by a mail server; the trail records that the notice did not go out.
 */
async function handlePOST(request: Request) {
  const before = await getSnapshot();

  if (!before.plan.sealedAt) {
    return NextResponse.json({ ok: false, error: "This plan is not sealed." }, { status: 400 });
  }

  const result = await unsealPlanAction();
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  let notice: Awaited<ReturnType<typeof notifyKeyholderUnsealed>> | null = null;
  const keyholder = result.snapshot.keyholder;
  if (keyholder?.email && mailConfigured()) {
    notice = await notifyKeyholderUnsealed(new URL(request.url).origin, {
      ownerName: result.snapshot.user.name,
      keyholder: { name: keyholder.name, email: keyholder.email },
    }).catch(() => null);
  }

  return NextResponse.json({ ...result, keyholderMail: notice });
}

export const POST = guarded(handlePOST);
