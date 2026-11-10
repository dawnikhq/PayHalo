import type { StateDoc } from "@/lib/model";
import type { Driver } from "./types";

declare global {
  var __vivoMemory: Map<string, StateDoc> | undefined;
}

/**
 * Last-resort driver: keeps the document alive for the lifetime of the
 * process. Used on serverless platforms before a durable store is attached,
 * so the demo still works instead of erroring on a read-only filesystem.
 */
export function memoryDriver(): Driver {
  return {
    kind: "memory",
    label: "In-memory (resets per instance)",
    durable: false,
    async load(ownerId: string) {
      return global.__vivoMemory?.get(ownerId) ?? null;
    },
    async save(ownerId: string, doc: StateDoc) {
      if (!global.__vivoMemory) global.__vivoMemory = new Map();
      global.__vivoMemory.set(ownerId, doc);
    },
  };
}
