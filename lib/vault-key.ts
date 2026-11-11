import crypto from "node:crypto";

/**
 * The vault key.
 *
 * One key is minted when a plan starts and is emailed to the first
 * beneficiary. Only its SHA-256 is stored, so nobody — not an operator, not the
 * database — can read it back. Holding the key is how a named person proves
 * they are the person the owner meant, and it is required to ask for a release.
 */
export function mintVaultKey(vaultRef: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let body = "";
  for (let i = 0; i < 10; i += 1) body += alphabet[crypto.randomInt(alphabet.length)];
  return `${vaultRef}-${body.slice(0, 5)}-${body.slice(5)}`;
}

export function hashVaultKey(key: string): string {
  return crypto.createHash("sha256").update(key.trim().toUpperCase(), "utf8").digest("hex");
}

export function vaultKeyMatches(candidate: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !candidate) return false;
  const a = crypto.createHash("sha256").update(candidate.trim().toUpperCase(), "utf8").digest();
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
