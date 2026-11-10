/**
 * A small fixed-window limiter for the auth endpoints. Per process, which is
 * enough to blunt password guessing on a single instance; a distributed
 * deployment would move this to Redis.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function tooMany(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}
