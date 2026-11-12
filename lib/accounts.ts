import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { hashToken, newToken } from "./session";

/**
 * VIVO's own accounts — not Supabase Auth.
 *
 * Supabase is the database here: this module talks to PostgREST with the
 * service key (server-side only), exactly like the document store does. The
 * three tables are `vivo_users`, `vivo_sessions` and `vivo_login_tokens`, all
 * with RLS on and no policies.
 *
 * A SQLite driver mirrors them for local development, so the whole sign-in
 * flow can be exercised without a network.
 */
export type LoginPurpose = "signin" | "set-password" | "confirm-email";

export interface Account {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  /** Null until the person has clicked the link we emailed them. */
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
}

interface Store {
  create(email: string, name: string | null, passwordHash: string | null): Promise<Account | "exists">;
  byEmail(email: string): Promise<Account | null>;
  byId(id: string): Promise<Account | null>;
  setPassword(id: string, passwordHash: string): Promise<void>;
  addSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void>;
  sessionUser(tokenHash: string): Promise<Account | null>;
  dropSession(tokenHash: string): Promise<void>;
  addLoginToken(tokenHash: string, userId: string, purpose: string, expiresAt: Date): Promise<void>;
  takeLoginToken(tokenHash: string, purpose: string): Promise<string | null>;
  markVerified(id: string): Promise<void>;
  markLogin(id: string): Promise<void>;
  list(): Promise<Account[]>;
}

/* --------------------------------------------------------------- postgres */

function supabaseStore(): Store | null {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = (
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    ""
  ).trim();
  if (!url || !key || !/^https?:\/\//.test(url)) return null;

  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  async function call<T>(pathAndQuery: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      if (res.status === 409 || /duplicate key|unique/i.test(text)) return "exists" as unknown as T;
      throw new Error(`accounts: ${res.status} ${text.slice(0, 200)}`);
    }
    return (text ? JSON.parse(text) : null) as T;
  }

  const row = (r: Record<string, unknown>): Account => ({
    id: String(r.id),
    email: String(r.email),
    name: (r.name as string | null) ?? null,
    passwordHash: (r.password_hash as string | null) ?? null,
    emailVerifiedAt: (r.email_verified_at as string | null) ?? null,
    lastLoginAt: (r.last_login_at as string | null) ?? null,
    createdAt: (r.created_at as string | null) ?? null,
  });

  const SHAPE = "id,email,name,password_hash,email_verified_at,last_login_at,created_at";

  const api: Store = {
    async create(email, name, passwordHash) {
      const rows = await call<Record<string, unknown>[] | "exists">(`vivo_users?select=${SHAPE}`, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify([{ email, name, password_hash: passwordHash }]),
      });
      if (rows === "exists") return "exists";
      const first = Array.isArray(rows) ? rows[0] : null;
      if (!first) throw new Error("accounts: insert returned nothing");
      return row(first);
    },

    async byEmail(email) {
      const rows = await call<Record<string, unknown>[]>(
        `vivo_users?email=ilike.${encodeURIComponent(email)}&select=${SHAPE}&limit=1`,
      );
      return rows?.[0] ? row(rows[0]) : null;
    },

    async byId(id) {
      const rows = await call<Record<string, unknown>[]>(
        `vivo_users?id=eq.${encodeURIComponent(id)}&select=${SHAPE}&limit=1`,
      );
      return rows?.[0] ? row(rows[0]) : null;
    },

    async setPassword(id, passwordHash) {
      await call(`vivo_users?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ password_hash: passwordHash, updated_at: new Date().toISOString() }),
      });
    },

    async addSession(tokenHash, userId, expiresAt) {
      await call("vivo_sessions", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([{ token_hash: tokenHash, user_id: userId, expires_at: expiresAt.toISOString() }]),
      });
    },

    async sessionUser(tokenHash) {
      const rows = await call<{ user_id: string; expires_at: string }[]>(
        `vivo_sessions?token_hash=eq.${encodeURIComponent(tokenHash)}&select=user_id,expires_at&limit=1`,
      );
      const hit = rows?.[0];
      if (!hit) return null;
      if (Date.parse(hit.expires_at) <= Date.now()) {
        await call(`vivo_sessions?token_hash=eq.${encodeURIComponent(tokenHash)}`, { method: "DELETE" });
        return null;
      }
      return api.byId(hit.user_id);
    },

    async dropSession(tokenHash) {
      await call(`vivo_sessions?token_hash=eq.${encodeURIComponent(tokenHash)}`, { method: "DELETE" });
    },

    async addLoginToken(tokenHash, userId, purpose, expiresAt) {
      await call("vivo_login_tokens", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([
          { token_hash: tokenHash, user_id: userId, purpose, expires_at: expiresAt.toISOString() },
        ]),
      });
    },

    async takeLoginToken(tokenHash, purpose) {
      const rows = await call<{ user_id: string; expires_at: string; used_at: string | null }[]>(
        `vivo_login_tokens?token_hash=eq.${encodeURIComponent(tokenHash)}&purpose=eq.${purpose}&select=user_id,expires_at,used_at&limit=1`,
      );
      const hit = rows?.[0];
      if (!hit || hit.used_at) return null;
      if (Date.parse(hit.expires_at) <= Date.now()) return null;
      await call(`vivo_login_tokens?token_hash=eq.${encodeURIComponent(tokenHash)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ used_at: new Date().toISOString() }),
      });
      return hit.user_id;
    },

    async markVerified(id) {
      await call(`vivo_users?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ email_verified_at: new Date().toISOString() }),
      });
    },

    async markLogin(id) {
      await call(`vivo_users?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ last_login_at: new Date().toISOString() }),
      });
    },

    async list() {
      const rows = await call<Record<string, unknown>[]>(`vivo_users?select=${SHAPE}&order=created_at.desc&limit=500`);
      return (rows ?? []).map(row);
    },
  };

  return api;
}

/* ----------------------------------------------------------------- sqlite */

let sqliteDb: import("node:sqlite").DatabaseSync | null = null;

async function sqliteStore(): Promise<Store | null> {
  try {
    const { DatabaseSync } = await import("node:sqlite");
    if (!sqliteDb) {
      const dir = path.join(process.cwd(), "data");
      fs.mkdirSync(dir, { recursive: true });
      const db = new DatabaseSync(path.join(dir, "hack1.db"));
      db.exec(`
        CREATE TABLE IF NOT EXISTS vivo_users (
          id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, password_hash TEXT,
          email_verified_at TEXT, last_login_at TEXT, created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS vivo_sessions (
          token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS vivo_login_tokens (
          token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, purpose TEXT NOT NULL,
          expires_at TEXT NOT NULL, used_at TEXT
        );
      `);
      sqliteDb = db;
    }
    const db = sqliteDb;
    // a database created before confirmation existed gets the new columns
    const cols = db.prepare("PRAGMA table_info(vivo_users)").all() as { name: string }[];
    for (const [name, type] of [
      ["email_verified_at", "TEXT"],
      ["last_login_at", "TEXT"],
      ["created_at", "TEXT"],
    ] as const) {
      if (!cols.some((c) => c.name === name)) db.exec(`ALTER TABLE vivo_users ADD COLUMN ${name} ${type}`);
    }

    const map = (r: Record<string, unknown> | undefined): Account | null =>
      r
        ? {
            id: String(r.id),
            email: String(r.email),
            name: (r.name as string | null) ?? null,
            passwordHash: (r.password_hash as string | null) ?? null,
            emailVerifiedAt: (r.email_verified_at as string | null) ?? null,
            lastLoginAt: (r.last_login_at as string | null) ?? null,
            createdAt: (r.created_at as string | null) ?? null,
          }
        : null;

    const api: Store = {
      async create(email, name, passwordHash) {
        const exists = db.prepare("SELECT id FROM vivo_users WHERE lower(email) = lower(?)").get(email);
        if (exists) return "exists";
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        db.prepare(
          "INSERT INTO vivo_users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        ).run(id, email, name, passwordHash, createdAt);
        return { id, email, name, passwordHash, emailVerifiedAt: null, lastLoginAt: null, createdAt };
      },
      async byEmail(email) {
        return map(db.prepare("SELECT * FROM vivo_users WHERE lower(email) = lower(?)").get(email) as never);
      },
      async byId(id) {
        return map(db.prepare("SELECT * FROM vivo_users WHERE id = ?").get(id) as never);
      },
      async setPassword(id, passwordHash) {
        db.prepare("UPDATE vivo_users SET password_hash = ? WHERE id = ?").run(passwordHash, id);
      },
      async addSession(tokenHash, userId, expiresAt) {
        db.prepare("INSERT INTO vivo_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
          tokenHash,
          userId,
          expiresAt.toISOString(),
        );
      },
      async sessionUser(tokenHash) {
        const row = db.prepare("SELECT user_id, expires_at FROM vivo_sessions WHERE token_hash = ?").get(tokenHash) as
          | { user_id: string; expires_at: string }
          | undefined;
        if (!row) return null;
        if (Date.parse(row.expires_at) <= Date.now()) {
          db.prepare("DELETE FROM vivo_sessions WHERE token_hash = ?").run(tokenHash);
          return null;
        }
        return api.byId(row.user_id);
      },
      async dropSession(tokenHash) {
        db.prepare("DELETE FROM vivo_sessions WHERE token_hash = ?").run(tokenHash);
      },
      async addLoginToken(tokenHash, userId, purpose, expiresAt) {
        db.prepare(
          "INSERT INTO vivo_login_tokens (token_hash, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)",
        ).run(tokenHash, userId, purpose, expiresAt.toISOString());
      },
      async takeLoginToken(tokenHash, purpose) {
        const row = db
          .prepare("SELECT user_id, expires_at, used_at FROM vivo_login_tokens WHERE token_hash = ? AND purpose = ?")
          .get(tokenHash, purpose) as { user_id: string; expires_at: string; used_at: string | null } | undefined;
        if (!row || row.used_at) return null;
        if (Date.parse(row.expires_at) <= Date.now()) return null;
        db.prepare("UPDATE vivo_login_tokens SET used_at = ? WHERE token_hash = ?").run(
          new Date().toISOString(),
          tokenHash,
        );
        return row.user_id;
      },

      async markVerified(id) {
        db.prepare("UPDATE vivo_users SET email_verified_at = ? WHERE id = ?").run(new Date().toISOString(), id);
      },
      async markLogin(id) {
        db.prepare("UPDATE vivo_users SET last_login_at = ? WHERE id = ?").run(new Date().toISOString(), id);
      },
      async list() {
        return (
          db.prepare("SELECT * FROM vivo_users ORDER BY created_at DESC LIMIT 500").all() as Record<string, unknown>[]
        ).map((r) => map(r) as Account);
      },
    };

    return api;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ public */

async function store(): Promise<Store | null> {
  const forced = process.env.VIVO_AUTH_STORE?.trim();
  if (forced === "sqlite") return sqliteStore();
  if (forced === "supabase") return supabaseStore();
  return supabaseStore() ?? (await sqliteStore());
}

export async function accountsAvailable(): Promise<boolean> {
  return (await store()) !== null;
}

export async function createAccount(
  email: string,
  name: string | null,
  passwordHash: string | null,
): Promise<Account | "exists"> {
  const s = await store();
  if (!s) throw new Error("Accounts are unavailable right now.");
  return s.create(email.trim().toLowerCase(), name?.trim() || null, passwordHash);
}

export async function accountByEmail(email: string): Promise<Account | null> {
  const s = await store();
  return s ? s.byEmail(email.trim().toLowerCase()) : null;
}

export async function accountById(id: string): Promise<Account | null> {
  const s = await store();
  return s ? s.byId(id) : null;
}

export async function listAccounts(): Promise<Account[]> {
  const s = await store();
  if (!s) return [];
  try {
    return await s.list();
  } catch {
    return [];
  }
}

export async function markEmailVerified(userId: string): Promise<void> {
  const s = await store();
  if (s) await s.markVerified(userId);
}

export async function markLogin(userId: string): Promise<void> {
  const s = await store();
  if (s) await s.markLogin(userId);
}

export async function setPassword(userId: string, passwordHash: string): Promise<void> {
  const s = await store();
  if (s) await s.setPassword(userId, passwordHash);
}

/** Returns the raw token; only its hash is stored. */
export async function startSession(userId: string, days = 30): Promise<string> {
  const s = await store();
  if (!s) throw new Error("Accounts are unavailable right now.");
  const token = newToken();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await s.addSession(hashToken(token), userId, expiresAt);
  return token;
}

export async function sessionAccount(token: string): Promise<Account | null> {
  const s = await store();
  return s ? s.sessionUser(hashToken(token)) : null;
}

export async function endSession(token: string): Promise<void> {
  const s = await store();
  if (s) await s.dropSession(hashToken(token));
}

export async function startLoginToken(userId: string, purpose: LoginPurpose, minutes = 20): Promise<string> {
  const s = await store();
  if (!s) throw new Error("Accounts are unavailable right now.");
  const token = newToken();
  await s.addLoginToken(hashToken(token), userId, purpose, new Date(Date.now() + minutes * 60 * 1000));
  return token;
}

export async function redeemLoginToken(token: string, purpose: LoginPurpose): Promise<string | null> {
  const s = await store();
  return s ? s.takeLoginToken(hashToken(token), purpose) : null;
}


/* ------------------------------------------------------- sign-in codes ---- */

/**
 * The six-digit second factor. Only the hash of `code + user` is stored, so a
 * read of the table cannot be replayed as a code, and a code minted for one
 * account is useless on another.
 */
export async function startLoginCode(userId: string, code: string, minutes = 10): Promise<void> {
  const s = await store();
  if (!s) throw new Error("Accounts are unavailable right now.");
  await s.addLoginToken(hashToken(`code:${userId}:${code}`), userId, "signin-code", new Date(Date.now() + minutes * 60 * 1000));
}

export async function redeemLoginCode(userId: string, code: string): Promise<boolean> {
  const s = await store();
  if (!s) return false;
  return Boolean(await s.takeLoginToken(hashToken(`code:${userId}:${code}`), "signin-code"));
}

/** Six digits, from the system's own randomness. */
export function sixDigits(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}
