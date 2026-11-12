import { cookies } from "next/headers";
import crypto from "node:crypto";

/**
 * One PayPal connection per browser. The cookie is opaque and httpOnly: it
 * identifies a connection record, never a token, and the token itself never
 * leaves the server.
 */
export const PAYPAL_COOKIE = "vivo_paypal_sid";

export async function readSid(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(PAYPAL_COOKIE)?.value ?? "";
  return /^[a-f0-9]{32}$/.test(value) ? value : null;
}

/** Route handlers may set cookies; page components may not. */
export function mintSid(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}
