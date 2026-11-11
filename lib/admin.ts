import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * The operator side.
 *
 * PayHalo staff hold one passcode, not accounts: they can read a release
 * request, mark it under review, approve or decline. They cannot see a vault
 * key, cannot move money anywhere, and cannot change who a plan pays — the
 * approval signature in lib/model.ts has no amount and no destination.
 */
export const ADMIN_COOKIE = "payhalo_admin";

export function adminConfigured(): boolean {
  return Boolean((process.env.ADMIN_PASSCODE ?? "").trim());
}

function digest(value: string): Buffer {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

export function checkAdminPasscode(candidate: string): boolean {
  const expected = (process.env.ADMIN_PASSCODE ?? "").trim();
  if (!expected || !candidate) return false;
  return crypto.timingSafeEqual(digest(candidate.trim()), digest(expected));
}

/** The cookie never carries the passcode: only a hash of it. */
export function adminCookieValue(): string {
  const expected = (process.env.ADMIN_PASSCODE ?? "").trim();
  const salt = (process.env.VIVO_SHARE_SECRET ?? "payhalo-admin").trim();
  return crypto.createHash("sha256").update(`operator:${expected}:${salt}`, "utf8").digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const jar = await cookies();
  const given = jar.get(ADMIN_COOKIE)?.value ?? "";
  if (!given) return false;
  const expected = adminCookieValue();
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  };
}
