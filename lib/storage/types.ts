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
}
