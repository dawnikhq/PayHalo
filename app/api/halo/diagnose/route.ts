import { NextResponse } from "next/server";
import { aiKey, aiProvider, groqFallbackModels, groqModels } from "@/lib/ai";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/halo/diagnose — which models this deployment can actually reach.
 *
 * Halo names two models and rotates between them. Model ids get retired, and a
 * key can be enabled for one family and not another, so the honest question is
 * "does the id in the code exist on Groq today?" — asked here rather than
 * discovered by a judge asking Halo a question. Reachable by an operator session
 * or the machine key, and it never returns the key itself.
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

  if (aiProvider() !== "groq") {
    return NextResponse.json({ configured: false, provider: aiProvider(), pool, fallbacks });
  }

  const base = (process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1").trim().replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${aiKey("groq")}`, Accept: "application/json" },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as { data?: { id?: string }[]; error?: unknown };
    const ids = (body.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));

    const reachable = Object.fromEntries([...pool, ...fallbacks].map((id) => [id, ids.includes(id)]));

    /*
     * ?ping=1 asks each model in the pool for one short sentence, so the whole
     * path — key, model, chat shape, our parser — is proved in one request
     * rather than by asking Halo a question and hoping.
     */
    const ping = new URL(request.url).searchParams.get("ping");
    let live: { model: string; ok: boolean; ms: number; text?: string; error?: string }[] | undefined;
    if (ping) {
      live = [];
      for (const model of pool) {
        const started = Date.now();
        try {
          const r = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${aiKey("groq")}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: "Answer in one short sentence." },
                { role: "user", content: "In one sentence, what is PayHalo for?" },
              ],
              temperature: 0.2,
              max_tokens: 80,
            }),
            cache: "no-store",
          });
          const body = (await r.json().catch(() => ({}))) as {
            choices?: { message?: { content?: string } }[];
            error?: { message?: string };
          };
          const text = (body.choices?.[0]?.message?.content ?? "").trim();
          live.push({
            model,
            ok: r.ok && Boolean(text),
            ms: Date.now() - started,
            text: text.slice(0, 160),
            error: text ? undefined : body.error?.message ?? `status ${r.status}`,
          });
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
      listed: res.ok,
      status: res.status,
      reachable,
      live,
      qwen: ids.filter((id) => id.toLowerCase().includes("qwen")),
      gptOss: ids.filter((id) => id.toLowerCase().includes("gpt-oss")),
    });
  } catch (error) {
    return NextResponse.json(
      { configured: true, provider: "groq", pool, fallbacks, error: error instanceof Error ? error.message : "unreachable" },
      { status: 502 },
    );
  }
}
