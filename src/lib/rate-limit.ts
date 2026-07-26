import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

// Prozessweite Zähler (eine Node-Instanz pro Container). Über globalThis,
// damit Dev-HMR die Buckets nicht verliert.
const globalForLimiter = globalThis as unknown as {
  swBuckets?: Map<string, Bucket>;
};
const buckets = globalForLimiter.swBuckets ?? new Map<string, Bucket>();
globalForLimiter.swBuckets = buckets;

/**
 * Client-IP aus dem Proxy-Header. nginx überschreibt X-Forwarded-For mit der
 * echten Adresse (kein Anhängen), daher ist der erste Eintrag vertrauenswürdig.
 */
export function clientIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

/** Gleitendes Limit pro Schlüssel. true = Anfrage erlaubt. */
export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();

  // Gelegentlich aufräumen, damit die Map nicht unbegrenzt wächst
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}
