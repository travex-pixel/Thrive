import "server-only";

/**
 * Best-effort, per-instance rate limiting for the two payment routes. Serverless instances don't share memory, so this
 * only dampens bursts from one client (e.g. a script hammering checkout); Stripe's own limits are the backstop.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  // Netlify and Vercel each set their own header with the visitor's IP; x-forwarded-for is the fallback.
  return request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-real-ip") ?? forwarded ?? "unknown";
}

/** Returns true when this client has made more than `limit` requests in the window. */
export function isRateLimited(scope: string, request: Request, limit: number, windowMs: number, now = Date.now()): boolean {
  const key = `${scope}:${clientKey(request)}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return false;
  }
  bucket.count++;
  return bucket.count > limit;
}
