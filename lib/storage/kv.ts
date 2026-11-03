import type { StateDoc } from "@/lib/model";
import type { Driver } from "./types";

const KEY = "hack1:state";

/**
 * Upstash Redis / Vercel KV REST driver (no SDK, no bundling surprises).
 * Whichever pair of env vars the Vercel marketplace injects, this picks it up.
 */
export function kvDriver(): Driver | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  async function command(args: (string | number)[]): Promise<unknown> {
    const res = await fetch(url!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`KV command failed: ${res.status}`);
    const json = (await res.json()) as { result?: unknown; error?: string };
    if (json.error) throw new Error(json.error);
    return json.result;
  }

  return {
    kind: "kv",
    label: "Vercel KV / Upstash Redis",
    durable: true,
    async load() {
      const raw = await command(["GET", KEY]);
      if (typeof raw !== "string" || !raw) return null;
      try {
        return JSON.parse(raw) as StateDoc;
      } catch {
        return null;
      }
    },
    async save(doc: StateDoc) {
      await command(["SET", KEY, JSON.stringify(doc)]);
    },
  };
}
