import fs from "node:fs";
import path from "node:path";
import type { StateDoc } from "@/lib/model";
import type { Driver } from "./types";

/**
 * Local development driver. Uses Node's built-in SQLite (no native build),
 * storing the whole document in a single row.
 */
export async function sqliteDriver(): Promise<Driver | null> {
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const db = new DatabaseSync(path.join(dir, "hack1.db"));
    db.exec(
      "CREATE TABLE IF NOT EXISTS docs (owner TEXT PRIMARY KEY, doc TEXT NOT NULL);",
    );

    const read = db.prepare("SELECT doc FROM docs WHERE owner = ?");
    const write = db.prepare("INSERT OR REPLACE INTO docs (owner, doc) VALUES (?, ?)");

    return {
      kind: "sqlite",
      label: "SQLite (local file)",
      durable: true,
      async load(ownerId: string) {
        const row = read.get(ownerId) as { doc?: string } | undefined;
        if (!row?.doc) return null;
        return JSON.parse(row.doc) as StateDoc;
      },
      async save(ownerId: string, doc: StateDoc) {
        write.run(ownerId, JSON.stringify(doc));
      },
    };
  } catch {
    return null;
  }
}
