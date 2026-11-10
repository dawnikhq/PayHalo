import type { StateDoc } from "@/lib/model";
import type { Driver } from "./types";

declare global {
  var __hack1Memory: StateDoc | null | undefined;
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
    async load() {
      return global.__hack1Memory ?? null;
    },
    async save(doc: StateDoc) {
      global.__hack1Memory = doc;
    },
  };
}
