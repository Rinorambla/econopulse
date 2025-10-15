// Simple in-memory rate limiter (process-local). For production, prefer Redis or a durable store.
type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  limit: number;
  reset: number; // epoch seconds
}

export function getClientIp(req: Request): string {
  try {
    // NextRequest exposes headers; x-forwarded-for may contain list
    const xf = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const cfip = req.headers.get('cf-connecting-ip') || '';
    const realip = req.headers.get('x-real-ip') || '';
    return xf || cfip || realip || 'unknown';
  } catch {
    return 'unknown';
  }
}

export function rateLimit(key: string, limit = 60, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) {
    const reset = now + windowMs;
    buckets.set(key, { count: 1, reset });
    return { ok: true, remaining: limit - 1, limit, reset: Math.floor(reset / 1000) };
  }

  if (bucket.count < limit) {
    bucket.count += 1;
    return { ok: true, remaining: limit - bucket.count, limit, reset: Math.floor(bucket.reset / 1000) };
  }

  return { ok: false, remaining: 0, limit, reset: Math.floor(bucket.reset / 1000) };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset)
  };
}
