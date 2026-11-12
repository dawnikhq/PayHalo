import { NextResponse } from "next/server";
import { aiKey, aiProvider, groqChat, groqFallbackModels, groqModels } from "@/lib/ai";
import { isAdmin } from "@/lib/admin";
import { HALO_SYSTEM } from "@/lib/halo";
import { PAYHALO_KNOWLEDGE } from "@/lib/halo-knowledge";

export const dynamic = "force-dynamic";

/**
 * GET /api/halo/diagnose — which models this deployment can actually reach, and
 * whether they answer with the product in their prompt.
 *
 * Halo names two models and rotates between them. Model ids get retired, a key
 * can be enabled for one family and not another, and a reasoning model can spend
 * its whole budget thinking and return nothing. All three have happened here, so
 * this endpoint answers the question directly instead of leaving a judge to
 * discover it through a quiet fallback. `?ping=1` asks each model in the pool one
 * question with Halo's real system prompt. Reachable by an operator session or the
 * machine key; it never returns the key itself.
 */
function keyFrom(request: Request): string {
  const url = new URL(request.url);
  return (request.headers.get("x-diagnose-key") ?? url.searchParams.get("key") ?? "").trim();
}

function keyMatches(request: Request): boolean {
  const expected = (process.env.MAIL_DIAGNOSE_KEY ?? "").trim();
  const given = keyFrom(request);
  if (!expected || !given) return false;
  let diff = expected.length ^ given.length;
  for (let i = 0; i < Math.min(expected.length, given.length); i += 1) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}

export async function GET(request: Request) {
  if (!keyMatches(request) && !(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const pool = groqModels();
  const fallbacks = groqFallbackModels();
  const knowledgeChars = PAYHALO_KNOWLEDGE.length;

  if (aiProvider() !== "groq") {
    return NextResponse.json({ configured: false, provider: aiProvider(), pool, fallbacks, knowledgeChars });
  }

  const base = (process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1").trim().replace(/\/+$/, "");

  let ids: string[] = [];
  let listed = false;
  let status = 0;
  try {
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${aiKey("groq")}`, Accept: "application/json" },
      cache: "no-store",
    });
    listed = res.ok;
    status = res.status;
    const body = (await res.json().catch(() => ({}))) as { data?: { id?: string }[] };
    ids = (body.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
  } catch {
    /* fall through: reachable stays empty and ping will say more */
  }

  const reachable = Object.fromEntries([...pool, ...fallbacks].map((id) => [id, ids.includes(id)]));

  let live: { model: string; ok: boolean; ms: number; text?: string; error?: string }[] | undefined;
  if (new URL(request.url).searchParams.get("ping")) {
    live = [];
    for (const model of pool) {
      const started = Date.now();
      try {
        const answer = await groqChat({
          model,
          messages: [
            { role: "system", content: HALO_SYSTEM },
            {
              role: "user",
              content: "In one sentence, what is PayHalo for? Answer only from what you know.",
            },
          ],
          temperature: 0.2,
          maxTokens: 300,
        });
        live.push({ model, ok: true, ms: Date.now() - started, text: answer.text.slice(0, 180) });
      } catch (error) {
        live.push({
          model,
          ok: false,
          ms: Date.now() - started,
          error: error instanceof Error ? error.message : "unreachable",
        });
      }
    }
  }

  return NextResponse.json({
    configured: true,
    provider: "groq",
    pool,
    fallbacks,
    listed,
    status,
    reachable,
    live,
    knowledgeChars,
    qwen: ids.filter((id) => id.toLowerCase().includes("qwen")),
    gptOss: ids.filter((id) => id.toLowerCase().includes("gpt-oss")),
  });
}
