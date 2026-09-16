// Fixed-window in-memory rate limiter, keyed by caller-supplied key (e.g. IP).
// Per-instance only: on serverless each instance enforces independently — a
// distributed abuser would need shared-state limiting (Upstash/DB). Combined
// with the term length cap this still bounds the AI cost one client can cause.
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets; only meaningful when !ok. */
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    // Opportunistic cleanup so abandoned IPs don't grow the map unbounded.
    if (buckets.size >= 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}
