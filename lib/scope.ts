import { cookies } from "next/headers";
import { currentUser, type SessionUser } from "./auth";
import { SHARE_COOKIE, readShareToken, type ShareAudience } from "./share";
import { getDriver } from "./storage";

/**
 * A Trusted Key who has made an account is recognised by the address the owner
 * named. It is the same trust boundary as the email link — the owner typed that
 * address into their own plan — and it is what lets the code live behind a
 * login instead of inside an inbox.
 */
async function keyholderOwnerFor(email: string): Promise<string | null> {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  try {
    const driver = await getDriver();
    if (!driver.scan) return null;
    const docs = await driver.scan();
    const hit = docs.find(({ doc }) => (doc.keyholder?.email ?? "").trim().toLowerCase() === needle);
    return hit ? hit.key : null;
  } catch {
    return null;
  }
}

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
  if (parsed && parsed.audience === audience) return parsed.ownerId;

  /* no link in this browser: a signed-in person named as Trusted Key still gets in */
  if (audience === "keyholder") {
    const user = await currentUser();
    if (user?.email) return keyholderOwnerFor(user.email);
  }
  return null;
}

export { currentUser };
