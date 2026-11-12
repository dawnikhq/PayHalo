import crypto from "node:crypto";

/**
 * Passwords are hashed with scrypt — memory-hard, in Node core, no native
 * build to break on Vercel. The stored string carries its own parameters so a
 * future cost bump can verify old hashes and re-hash on next sign-in.
 */
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;

function scrypt(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password.normalize("NFKC"), salt, KEYLEN, { N: n, r, p, maxmem: 128 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_BYTES);
  const key = await scrypt(password, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!n || !r || !p) return false;

  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  const actual = await scrypt(password, salt, n, r, p);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

/** Rules the sign-up form and the API agree on. */
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return "Use at least 10 characters.";
  if (password.length > 200) return "That is too long.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "Mix letters and numbers.";
  return null;
}
