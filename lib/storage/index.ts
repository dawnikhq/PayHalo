import { kvDriver } from "./kv";
import { memoryDriver } from "./memory";
import { sqliteDriver } from "./sqlite";
import type { Driver } from "./types";

export type { Driver, StoreKind } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __hack1Driver: Driver | undefined;
}

/**
 * Driver resolution order:
 *
 *   1. HACK1_STORE env override  (kv | sqlite | memory)  — for testing
 *   2. Vercel KV / Upstash Redis  when its env vars exist  — durable on Vercel
 *   3. SQLite on a writable local filesystem               — durable in dev
 *   4. In-memory                                           — always works
 */
export async function getDriver(): Promise<Driver> {
  if (global.__hack1Driver) return global.__hack1Driver;

  const forced = process.env.HACK1_STORE?.toLowerCase();
  let driver: Driver | null = null;

  if (forced === "memory") {
    driver = memoryDriver();
  } else if (forced === "kv") {
    driver = kvDriver();
  } else if (forced === "sqlite") {
    driver = await sqliteDriver();
  } else {
    driver = kvDriver() ?? (process.env.VERCEL ? null : await sqliteDriver()) ?? memoryDriver();
  }

  driver = driver ?? memoryDriver();
  global.__hack1Driver = driver;
  return driver;
}
