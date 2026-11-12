import { NextResponse } from "next/server";
import { haloOpening, factsFromSnapshot, haloReply, type HaloAudience } from "@/lib/halo";
import { getSnapshot } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import { SHARE_COOKIE, readShareToken } from "@/lib/share";
import { cookies } from "next/headers";
import { clientKey, tooMany } from "@/lib/throttle";

export const dynamic = "force-dynamic";

function questionFrom(body: unknown): string {
  const raw = (body as { message?: unknown } | null)?.message;
  return typeof raw === "string" ? raw.trim().slice(0, 600) : "";
}

/**
 * POST /api/halo — Halo answers, in the audience she is allowed to see.
 *
 * An owner gets their own plan. A Trusted Key or beneficiary arrives holding a
 * share link, so Halo reads the redacted view and nothing else. The operator
 * audience is served from the console, not here, so no passcode is reachable
 * through this door.
 */
export async function POST(request: Request) {
  if (tooMany(clientKey(request, "halo"), 30, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Halo needs a moment. Try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const question = questionFrom(body);

  try {
    const owner = await currentUser();
    const jar = await cookies();
    const share = owner ? null : readShareToken(jar.get(SHARE_COOKIE)?.value);

    let audience: HaloAudience = "owner";
    if (!owner) {
      if (share?.audience === "keyholder") audience = "keyholder";
      else if (share?.audience === "beneficiary") audience = "beneficiary";
      else return NextResponse.json({ error: "Sign in to talk to Halo." }, { status: 401 });
    }

    const snapshot = await getSnapshot(audience);
    const facts = factsFromSnapshot(snapshot, audience);

    if (!question) {
      return NextResponse.json(haloOpening(facts), { status: 200 });
    }

    const answer = await haloReply(question, facts);
    return NextResponse.json(answer);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Halo could not answer just now." },
      { status: 503 },
    );
  }
}
