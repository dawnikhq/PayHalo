import type { StateDoc } from "@/lib/model";

export type StoreKind = "supabase" | "kv" | "sqlite" | "memory";

/**
 * A driver is key-agnostic: every call names the owner whose document it wants.
 * `key` is the auth user id (a uuid) in production.
 */
export interface Driver {
  kind: StoreKind;
  label: string;
  durable: boolean;
  load(key: string): Promise<StateDoc | null>;
  save(key: string, doc: StateDoc): Promise<void>;
  /**
   * Every owner document, for the two cross-plan reads the product needs:
   * "which plans name me as a beneficiary" and the operator release queue.
   * Optional, because a driver that cannot enumerate simply has none.
   */
  scan?(): Promise<{ key: string; doc: StateDoc }[]>;
  /**
   * Every row, including the records that are not plans (wallets, support
   * requests). The index in ./index.ts keeps those out of `scan`, so a plan
   * counter can never count a ticket, and a ticket list can still be found.
   */
  scanAll?(): Promise<{ key: string; doc: StateDoc }[]>;
}
