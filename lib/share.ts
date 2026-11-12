import crypto from "node:crypto";

/**
 * Keyholder and beneficiary links.
 *
 * Those two portals have no session of their own — that is the point. A link
 * carries a signed claim to one owner's plan and one audience, so the holder
 * can see exactly what they were invited to see and nothing else. Rotating
 * VIVO_SHARE_SECRET invalidates every link ever issued.
 */
export type ShareAudience = "keyholder" | "beneficiary";

export const SHARE_COOKIE = "vivo_share";

function secret(): string {
  return (
    process.env.VIVO_SHARE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    "vivo-development-share-secret"
  );
}

function mac(body: string): string {
  return crypto.createHmac("sha256", secret()).update(body).digest("base64url").slice(0, 32);
}

export function shareToken(ownerId: string, audience: ShareAudience): string {
  const body = Buffer.from(JSON.stringify({ u: ownerId, a: audience })).toString("base64url");
  return `${body}.${mac(body)}`;
}

export function readShareToken(token: string | null | undefined): { ownerId: string; audience: ShareAudience } | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = mac(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { u?: string; a?: string };
    if (!parsed.u || (parsed.a !== "keyholder" && parsed.a !== "beneficiary")) return null;
    return { ownerId: parsed.u, audience: parsed.a };
  } catch {
    return null;
  }
}
