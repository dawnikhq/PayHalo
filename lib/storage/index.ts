import { kvDriver } from "./kv";
import { memoryDriver } from "./memory";
import { sqliteDriver } from "./sqlite";
import { supabaseDriver } from "./supabase";
import type { Driver } from "./types";

export type { Driver, StoreKind } from "./types";

declare global {
  var __hack1Driver: Driver | undefined;
}

/**
 * A public demo should never return a 500 because the remote store hiccuped.
 * This wrapper degrades to memory on the first error and reports itself as
 * non-durable, so the demo dock turns red instead of the page breaking.
 */
function guarded(primary: Driver): Driver {
  const backup = memoryDriver();
  let degraded = false;

  function degrade(err: unknown) {
    if (!degraded) {
      degraded = true;
      console.error("[hack1] storage driver unavailable, using memory:", err);
    }
  }

  return {
    get kind() {
      return degraded ? "memory" : primary.kind;
    },
    get label() {
      return degraded ? `${primary.label} (unreachable)` : primary.label;
    },
    get durable() {
      return degraded ? false : primary.durable;
    },
    async load(key) {
      if (degraded) return backup.load(key);
      try {
        return await primary.load(key);
      } catch (err) {
        degrade(err);
        return backup.load(key);
      }
    },
    async save(key, doc) {
      if (degraded) return backup.save(key, doc);
      try {
        await primary.save(key, doc);
      } catch (err) {
        degrade(err);
        await backup.save(key, doc);
      }
    },
  };
}

/**
 * Driver resolution order:
 *
 *   1. HACK1_STORE env override  (supabase | kv | sqlite | memory)  — for testing
 *   2. Supabase Postgres          when SUPABASE_URL + service key exist — durable on Vercel
 *   3. Vercel KV / Upstash Redis  when its env vars exist                — durable on Vercel
 *   4. SQLite on a writable local filesystem                             — durable in dev
 *   5. In-memory                                                         — always works
 */
export async function getDriver(): Promise<Driver> {
  if (global.__hack1Driver) return global.__hack1Driver;

  const forced = process.env.HACK1_STORE?.toLowerCase();
  let driver: Driver | null = null;

  if (forced === "memory") {
    driver = memoryDriver();
  } else if (forced === "supabase") {
    driver = supabaseDriver();
  } else if (forced === "kv") {
    driver = kvDriver();
  } else if (forced === "sqlite") {
    driver = await sqliteDriver();
  } else {
    driver =
      supabaseDriver() ??
      kvDriver() ??
      (process.env.VERCEL ? null : await sqliteDriver()) ??
      memoryDriver();
  }

  driver = driver ?? memoryDriver();
  if (!forced && driver.kind !== "memory" && driver.kind !== "sqlite") {
    driver = guarded(driver);
  }
  global.__hack1Driver = driver;
  return driver;
}
