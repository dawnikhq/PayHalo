import { cookies } from "next/headers";
import { currentUser, type SessionUser } from "./auth";
import { SHARE_COOKIE, readShareToken, type ShareAudience } from "./share";

/**
 * Who is asking, and whose document may they read?
 *
 * - owner (signed in)        → their own document, full audience
 * - keyholder/beneficiary    → an owner's document via a signed share link,
 *                              read through the redacted view builders
 * - nobody                   → no document at all
 */
export async function ownerSession(): Promise<SessionUser | null> {
  return currentUser();
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Sign in to continue.");
    this.name = "UnauthorizedError";
  }
}

/** The owner a share link points at, if the link is valid for that audience. */
export async function sharedOwner(audience: ShareAudience): Promise<string | null> {
  const jar = await cookies();
  const parsed = readShareToken(jar.get(SHARE_COOKIE)?.value ?? null);
  if (!parsed || parsed.audience !== audience) return null;
  return parsed.ownerId;
}

export { currentUser };
