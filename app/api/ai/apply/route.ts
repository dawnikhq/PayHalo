import { NextResponse } from "next/server";
import { validateDraft } from "@/lib/ai";
import { applyDraftAction } from "@/lib/store";
import { guarded } from "@/lib/route-guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/apply — write an approved draft into the plan.
 *
 * The payload is re-validated here, not trusted: a draft that arrives edited in
 * the browser still has to pass the model's own shaping rules and then
 * lib/model.ts on the way in.
 */
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

  const body = (await request.json().catch(() => null)) as { draft?: unknown } | null;
  const shaped = validateDraft(body?.draft);
  if (!shaped || (!shaped.people.length && !shaped.assets.length)) {
    return NextResponse.json({ error: "There was nothing in that draft to add." }, { status: 400 });
  }

  const result = await applyDraftAction({
    reading: shaped.reading,
    people: shaped.people,
    assets: shaped.assets,
    source: "model",
    model: null,
  });

  const extra = (result.extra ?? {}) as { addedPeople?: number; addedAssets?: number; skipped?: string[] };
  return NextResponse.json({
    ok: result.ok,
    error: result.error ?? null,
    addedPeople: extra.addedPeople ?? 0,
    addedAssets: extra.addedAssets ?? 0,
    skipped: extra.skipped ?? [],
  });
}

export const POST = guarded(handlePOST);
