/**
 * Simple in-memory fixed-window rate limiter — single-process, resets on restart.
 * Same "one Node process" assumption already documented for src/lib/event-bus.ts;
 * revisit with a shared store (e.g. Redis) if this app is ever horizontally scaled.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= max) return false;

  bucket.count += 1;
  return true;
}
