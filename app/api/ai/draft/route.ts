import { NextResponse } from "next/server";
import { aiConfigured, draftPlan, aiProvider } from "@/lib/ai";
import { guarded } from "@/lib/route-guard";
import { currentUser } from "@/lib/scope";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/draft — turn a paragraph into a draft plan.
 *
 * Read-only: nothing is written here. The draft comes back for the person to
 * approve, and applying it goes through the same validated writes as typing.
 */
async function handlePOST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

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

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 4000) : "";
  if (text.length < 20) {
    return NextResponse.json({ error: "Tell it a little more — a sentence or two." }, { status: 400 });
  }

  const draft = await draftPlan(text);
  return NextResponse.json({
    ok: true,
    draft,
    provider: aiProvider(),
    modelConfigured: aiConfigured(),
  });
}

export const POST = guarded(handlePOST);
