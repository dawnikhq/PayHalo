import { NextResponse } from "next/server";
import { UnauthorizedError } from "./scope";

/**
 * Route handlers talk to the store, which throws UnauthorizedError when the
 * session cookie is stale, forged or revoked. The middleware only knows that a
 * cookie exists; this turns the authoritative "no" into a 401 instead of a 500.
 */
export function guarded<T extends (...args: never[]) => Promise<Response>>(handler: T): T {
  return (async (...args: never[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
      }
      throw error;
    }
  }) as T;
}
