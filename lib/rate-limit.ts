/**
 * In-memory sliding-window limiter. Good enough for a single instance and
 * for keeping a bored visitor from hammering the message endpoint.
 *
 * At real scale, swap the Map for Upstash Redis — the interface stays the
 * same, but the counter has to live outside the process once you're running
 * more than one of them.
 */
const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  { limit = 20, windowMs = 60_000 } = {}
): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000),
    };
  }

  recent.push(now);
  hits.set(key, recent);

  // Opportunistic cleanup so the map doesn't grow without bound.
  if (hits.size > 5000)
    for (const [k, v] of hits)
      if (v.every((t) => now - t > windowMs)) hits.delete(k);

  return { ok: true, remaining: limit - recent.length, retryAfter: 0 };
}

export const clientKey = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
  req.headers.get("x-real-ip") ??
  "anon";
