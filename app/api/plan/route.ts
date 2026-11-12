import { NextResponse } from "next/server";
import { getSnapshot, sealPlanAction } from "@/lib/store";
import { guarded } from "@/lib/route-guard";
import { notifyKeyholder } from "@/lib/keyholder-mail";
import { mailConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";

/**
 * POST /api/plan — seal the arrangement.
 *
 * Sealing is the moment a plan becomes real, and the moment the Trusted Key must
 * hear about it. That is why the introduction is sent *first*: if the message
 * cannot go out, the plan is not sealed, and the screen says why. A plan nobody
 * was told about is not a finished plan.
 *
 * The message carries no access code, ever. If the Trusted Key already has an
 * account they are sent to sign in and the code waits in their portal; if they
 * do not, they are invited to create one with the address that was named.
 */
async function handlePOST(request: Request) {
  const snapshot = await getSnapshot();

  /* Sealing twice is a double click, not a second plan. */
  if (snapshot.plan.sealedAt) {
    return NextResponse.json({ ok: true, alreadySealed: true, snapshot });
  }

  const unfinished = snapshot.steps.filter((step) => !step.done && step.key !== "review");
  if (unfinished.length) {
    return NextResponse.json(
      { ok: false, error: `Finish these first: ${unfinished.map((s) => s.label).join(", ")}.` },
      { status: 400 },
    );
  }

  const keyholder = snapshot.keyholder;
  if (!keyholder || !keyholder.email) {
    return NextResponse.json(
      { ok: false, error: "Appoint a Trusted Key with an email address before sealing — they have to be told." },
      { status: 400 },
    );
  }

  if (!mailConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Email is unavailable on this deployment, so your Trusted Key cannot be told — and a plan is not sealed silently. Try again once mail is restored.",
      },
      { status: 503 },
    );
  }

  const notice = await notifyKeyholder(new URL(request.url).origin, {
    ownerName: snapshot.user.name,
    keyholder: { name: keyholder.name, email: keyholder.email },
  });

  if (!notice.sent) {
    return NextResponse.json(
      {
        ok: false,
        error: `The introduction to ${keyholder.name} could not be sent${
          notice.reason ? ` (${notice.reason})` : ""
        }. Nothing was sealed — try again, or fix the address in Settings.`,
        keyholderMail: notice,
      },
      { status: 502 },
    );
  }

  const result = await sealPlanAction();
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  return NextResponse.json({ ...result, keyholderMail: notice });
}

export const POST = guarded(handlePOST);
