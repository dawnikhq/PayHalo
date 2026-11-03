import type { StateDoc } from "@/lib/model";
import type { Driver } from "./types";

const TABLE = "hack1_state";
const ID = "hack1";

/**
 * Supabase Postgres driver — talks to PostgREST directly, no SDK.
 *
 * The whole document lives in one row (`id = 'hack1'`) as jsonb. Row level
 * security is on and no policies are defined, so only the service key (used
 * server-side only, never shipped to the browser) can read or write it.
 *
 * Expected env: SUPABASE_URL + SUPABASE_SERVICE_KEY (or the legacy
 * SUPABASE_SERVICE_ROLE_KEY name).
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
    async load() {
      const res = await fetch(`${endpoint}?id=eq.${ID}&select=data`, {
        headers: baseHeaders,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Supabase read failed (${res.status})`);
      const rows = (await res.json()) as { data: StateDoc }[];
      return rows[0]?.data ?? null;
    },
    async save(doc: StateDoc) {
      const res = await fetch(`${endpoint}?on_conflict=id`, {
        method: "POST",
        headers: {
          ...baseHeaders,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify([{ id: ID, data: doc, updated_at: new Date().toISOString() }]),
        cache: "no-store",
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Supabase write failed (${res.status}) ${detail.slice(0, 200)}`.trim());
      }
    },
  };
}
