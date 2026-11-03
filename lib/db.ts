import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedDemo } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "hack1.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asset (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  provider TEXT NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  detail TEXT NOT NULL DEFAULT '',
  connected INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS beneficiary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  relationship TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  share INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  available INTEGER NOT NULL DEFAULT 1,
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS keyholder (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  relationship TEXT NOT NULL DEFAULT '',
  access_code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sealed_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS claim (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  keyholder_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  document_name TEXT NOT NULL DEFAULT '',
  extracted TEXT NOT NULL DEFAULT '[]',
  confidence REAL NOT NULL DEFAULT 0,
  initiated_at TEXT NOT NULL,
  verified_at TEXT,
  window_ends_at TEXT,
  distributed_at TEXT
);

CREATE TABLE IF NOT EXISTS distribution (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER NOT NULL,
  beneficiary_id INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  share INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'released',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
`;

declare global {
  // eslint-disable-next-line no-var
  var __hack1Db: DatabaseSync | undefined;
}

function open(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);

  const row = db.prepare("SELECT COUNT(*) AS n FROM user").get() as { n: number };
  if (!row || row.n === 0) seedDemo(db);

  return db;
}

export function getDb(): DatabaseSync {
  if (!global.__hack1Db) global.__hack1Db = open();
  return global.__hack1Db;
}

/** Wipe everything and restore the curated demo household. */
export function resetDb(): void {
  const db = getDb();
  for (const t of ["distribution", "claim", "event", "beneficiary", "keyholder", "asset", "plan", "user"]) {
    db.exec(`DELETE FROM ${t};`);
    db.exec(`DELETE FROM sqlite_sequence WHERE name = '${t}';`);
  }
  seedDemo(db);
}
