/**
 * A passcode on a public demo is only as good as its rate limit. This is a
 * deliberately simple in-process counter: five wrong answers per IP per ten
 * minutes. It resets when a lambda instance recycles, which is fine — it exists
 * to stop casual guessing, not a distributed attack, and the passcode itself is
 * compared in constant time.
 */
const WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

declare global {
  var __vivoPasscodeGuard: Map<string, { count: number; resetAt: number }> | undefined;
}

function store(): Map<string, { count: number; resetAt: number }> {
  if (!globalThis.__vivoPasscodeGuard) globalThis.__vivoPasscodeGuard = new Map();
  return globalThis.__vivoPasscodeGuard;
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return ip;
}

export function registerFailure(key: string): { allowed: boolean; retryInMs: number } {
  const map = store();
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || entry.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryInMs: 0 };
  }

  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    return { allowed: false, retryInMs: entry.resetAt - now };
  }
  return { allowed: true, retryInMs: 0 };
}

export function isLockedOut(key: string): { locked: boolean; retryInMs: number } {
  const entry = store().get(key);
  if (!entry || entry.resetAt <= Date.now()) return { locked: false, retryInMs: 0 };
  return { locked: entry.count > MAX_ATTEMPTS, retryInMs: entry.resetAt - Date.now() };
}

export function clearFailures(key: string): void {
  store().delete(key);
}
