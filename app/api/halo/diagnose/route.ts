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

    return NextResponse.json({
      configured: true,
      provider: "groq",
      pool,
      fallbacks,
      listed: res.ok,
      status: res.status,
      reachable,
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
