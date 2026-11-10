import type { StateDoc } from "@/lib/model";
import type { Driver } from "./types";

const TABLE = "vivo_docs";

/**
 * Supabase Postgres driver — talks to PostgREST directly, no SDK.
 *
 * One row per owner (`user_id`), the whole plan document as jsonb. Row level
 * security is on with no policies, so only the service key — used server-side
 * only, never shipped to the browser — can read or write a row.
 */
export function supabaseDriver(): Driver | null {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  const key = (
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    ""
  ).trim();
  if (!url || !key || !/^https?:\/\//.test(url)) return null;

  const endpoint = `${url}/rest/v1/${TABLE}`;
  const baseHeaders: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  return {
    kind: "supabase",
    label: "Supabase Postgres",
    durable: true,
    async load(ownerId: string) {
      const res = await fetch(`${endpoint}?user_id=eq.${encodeURIComponent(ownerId)}&select=doc`, {
        headers: baseHeaders,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Supabase read failed (${res.status})`);
      const rows = (await res.json()) as { doc: StateDoc }[];
      return rows[0]?.doc ?? null;
    },
    async save(ownerId: string, doc: StateDoc) {
      const res = await fetch(`${endpoint}?on_conflict=user_id`, {
        method: "POST",
        headers: {
          ...baseHeaders,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify([{ user_id: ownerId, doc, updated_at: new Date().toISOString() }]),
        cache: "no-store",
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Supabase write failed (${res.status}) ${detail.slice(0, 200)}`.trim());
      }
    },
  };
}
