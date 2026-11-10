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
export interface Account {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
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
  });

  const api: Store = {
    async create(email, name, passwordHash) {
      const rows = await call<Record<string, unknown>[] | "exists">("vivo_users?select=id,email,name,password_hash", {
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
        `vivo_users?email=ilike.${encodeURIComponent(email)}&select=id,email,name,password_hash&limit=1`,
      );
      return rows?.[0] ? row(rows[0]) : null;
    },

    async byId(id) {
      const rows = await call<Record<string, unknown>[]>(
        `vivo_users?id=eq.${encodeURIComponent(id)}&select=id,email,name,password_hash&limit=1`,
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
          id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, password_hash TEXT
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
    const map = (r: Record<string, unknown> | undefined): Account | null =>
      r ? { id: String(r.id), email: String(r.email), name: (r.name as string | null) ?? null, passwordHash: (r.password_hash as string | null) ?? null } : null;

    const api: Store = {
      async create(email, name, passwordHash) {
        const exists = db.prepare("SELECT id FROM vivo_users WHERE lower(email) = lower(?)").get(email);
        if (exists) return "exists";
        const id = crypto.randomUUID();
        db.prepare("INSERT INTO vivo_users (id, email, name, password_hash) VALUES (?, ?, ?, ?)").run(
          id,
          email,
          name,
          passwordHash,
        );
        return { id, email, name, passwordHash };
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
  if (!s) throw new Error("Accounts are not configured on this deployment.");
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

export async function setPassword(userId: string, passwordHash: string): Promise<void> {
  const s = await store();
  if (s) await s.setPassword(userId, passwordHash);
}

/** Returns the raw token; only its hash is stored. */
export async function startSession(userId: string, days = 30): Promise<string> {
  const s = await store();
  if (!s) throw new Error("Accounts are not configured on this deployment.");
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

export async function startLoginToken(userId: string, purpose: "signin" | "set-password", minutes = 20): Promise<string> {
  const s = await store();
  if (!s) throw new Error("Accounts are not configured on this deployment.");
  const token = newToken();
  await s.addLoginToken(hashToken(token), userId, purpose, new Date(Date.now() + minutes * 60 * 1000));
  return token;
}

export async function redeemLoginToken(token: string, purpose: "signin" | "set-password"): Promise<string | null> {
  const s = await store();
  return s ? s.takeLoginToken(hashToken(token), purpose) : null;
}

