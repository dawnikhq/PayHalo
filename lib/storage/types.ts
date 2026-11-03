import type { StateDoc } from "@/lib/model";

export type StoreKind = "supabase" | "kv" | "sqlite" | "memory";

export interface Driver {
  kind: StoreKind;
  label: string;
  durable: boolean;
  load(): Promise<StateDoc | null>;
  save(doc: StateDoc): Promise<void>;
}
