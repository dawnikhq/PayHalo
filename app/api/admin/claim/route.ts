import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { claimQueue } from "@/lib/operator";
import { decideClaimByReview, SAFETY_WINDOW_DAYS } from "@/lib/store";
import { mailConfigured, sendClaimAccepted, sendClaimRefused } from "@/lib/mailer";

export const dynamic = "force-dynamic";

/** GET — the verification queue the operator console renders. */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Operator sign-in required." }, { status: 401 });
  return NextResponse.json({ claims: await claimQueue() });
}

/**
 * POST /api/admin/claim — the death-document decision.
 *
 * `accept` releases the registry hold so the safety window can begin; `reject`
 * closes the claim and leaves the plan with its owner. Either way the reason is
 * written into the plan's history, because this is the decision someone may one
 * day have to account for.
 *
 * The operator is neither owner nor Trusted Key, so the request carries the two
 * things that identify the claim: the account's address, and the claim number.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Operator sign-in required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { decision?: unknown; note?: unknown; ownerEmail?: unknown; claimId?: unknown }
    | null;

  const decision = body?.decision === "reject" ? "reject" : body?.decision === "accept" ? "accept" : null;
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  const ownerEmail = typeof body?.ownerEmail === "string" ? body.ownerEmail.trim() : "";
  const claimId = typeof body?.claimId === "number" ? body.claimId : null;

  if (!decision) {
    return NextResponse.json({ error: "Say whether the documents are accepted or refused." }, { status: 400 });
  }
  if (decision === "reject" && !note) {
    return NextResponse.json({ error: "Give a reason — the Trusted Key is told what was missing." }, { status: 400 });
  }
  if (!ownerEmail || claimId === null) {
    return NextResponse.json({ error: "That request could not be identified. Reload the desk." }, { status: 400 });
  }

  const result = await decideClaimByReview({ ownerEmail, claimId }, decision, note);
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  /*
   * Email is a courtesy, never the state. If the provider is down the decision
   * still stands, and both people still see it in their own portal.
   */
  const origin = new URL(request.url).origin;
  const snapshot = result.snapshot;
  const keyholder = snapshot.keyholder;
  const ownerName = snapshot.user.name || "The account holder";
  let mailed = false;

  try {
    if (decision === "accept") {
      await sendClaimAccepted(
        { keyholder: keyholder?.email, owner: snapshot.user.email },
        {
          ownerName,
          keyholderName: keyholder?.name ?? "Your Trusted Key",
          claimId,
          days: SAFETY_WINDOW_DAYS,
          ownerUrl: `${origin}/dashboard`,
          keyholderUrl: `${origin}/keyholder`,
        },
      );
      mailed = mailConfigured();
    } else if (keyholder?.email) {
      const sent = await sendClaimRefused(keyholder.email, {
        keyholderName: keyholder.name,
        ownerName,
        claimId,
        reason: note,
        url: `${origin}/keyholder`,
      });
      mailed = sent.sent;
    }
  } catch {
    mailed = false;
  }

  return NextResponse.json({ ok: true, claim: result.snapshot.claim, mailed });
}
