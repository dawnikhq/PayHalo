import type { StateDoc } from "@/lib/model";
import type { Driver } from "./types";

const TABLE = "vivo_docs";
/** Everything that is not a plan: wallets, support threads, PayPal links. */
const SIDE = "vivo_kv";

/**
 * Supabase Postgres driver — talks to PostgREST directly, no SDK.
 *
 * One row per owner (`user_id`), the whole plan document as jsonb. Row level
 * security is on with no policies, so only the service key — used server-side
 * only, never shipped to the browser — can read or write a row.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const side = `${url}/rest/v1/${SIDE}`;
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
      /*
       * A plan is keyed by an account id, which is a uuid. Records that live
       * beside a plan are keyed by purpose — `wallet:<id>`, `paypal:payer:<id>`
       * — and those are not uuids, so they go to their own table instead of
       * being rejected by a column that only speaks uuid.
       */
      const isPlan = UUID.test(ownerId);
      const target = isPlan
        ? `${endpoint}?user_id=eq.${encodeURIComponent(ownerId)}&select=doc`
        : `${side}?key=eq.${encodeURIComponent(ownerId)}&select=doc`;
      const res = await fetch(target, { headers: baseHeaders, cache: "no-store" });
      if (!res.ok) throw new Error(`Supabase read failed (${res.status})`);
      const rows = (await res.json()) as { doc: StateDoc }[];
      return rows[0]?.doc ?? null;
    },
    async scan() {
      const res = await fetch(`${endpoint}?select=user_id,doc`, { headers: baseHeaders, cache: "no-store" });
      if (!res.ok) throw new Error(`Supabase read failed (${res.status})`);
      const rows = (await res.json()) as { user_id: string; doc: StateDoc }[];
      return rows.filter((r) => r.doc).map((r) => ({ key: r.user_id, doc: r.doc }));
    },
    /** Plans and the records beside them — what wallets and support read. */
    async scanAll() {
      const [plans, side_rows] = await Promise.all([
        fetch(`${endpoint}?select=user_id,doc`, { headers: baseHeaders, cache: "no-store" }),
        fetch(`${side}?select=key,doc`, { headers: baseHeaders, cache: "no-store" }),
      ]);
      const out: { key: string; doc: StateDoc }[] = [];
      if (plans.ok) {
        for (const row of (await plans.json()) as { user_id: string; doc: StateDoc }[]) {
          if (row.doc) out.push({ key: row.user_id, doc: row.doc });
        }
      }
      if (side_rows.ok) {
        for (const row of (await side_rows.json()) as { key: string; doc: StateDoc }[]) {
          if (row.doc) out.push({ key: row.key, doc: row.doc });
        }
      }
      if (!plans.ok && !side_rows.ok) throw new Error("Supabase read failed");
      return out;
    },
    async save(ownerId: string, doc: StateDoc) {
      const isPlan = UUID.test(ownerId);
      const target = isPlan ? `${endpoint}?on_conflict=user_id` : `${side}?on_conflict=key`;
      const row = isPlan
        ? { user_id: ownerId, doc, updated_at: new Date().toISOString() }
        : { key: ownerId, doc, updated_at: new Date().toISOString() };
      const res = await fetch(target, {
        method: "POST",
        headers: {
          ...baseHeaders,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify([row]),
        cache: "no-store",
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Supabase write failed (${res.status}) ${detail.slice(0, 200)}`.trim());
      }
    },
  };
}
