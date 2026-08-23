/**
 * In-memory sliding-window limiter. Good enough for a single instance and
 * for keeping a bored visitor from hammering the message endpoint.
 *
 * At real scale, swap the Map for Upstash Redis — the interface stays the
 * same, but the counter has to live outside the process once you're running
 * more than one of them.
 */
const hits = new Map<string, number[]>();
// Which keys already got one "rate limited" log line for their current
// block — without this, a real flood (the actual case this exists to
// catch) would itself flood the log with one line per rejected request,
// burying the one signal ("someone's hammering X") in noise.
const warned = new Set<string>();

export function rateLimit(
  key: string,
  { limit = 20, windowMs = 60_000 } = {}
): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    // The one line of "would I know if someone was attacking me" this
    // module provides — every route already routes through here, so this
    // is the one place that needs it rather than every call site.
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`[rate-limit] blocked "${key}" — ${recent.length}+ requests in the last ${Math.round(windowMs / 1000)}s (limit ${limit}).`);
    }
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000),
    };
  }

  recent.push(now);
  hits.set(key, recent);
  warned.delete(key);

  // Opportunistic cleanup so the maps don't grow without bound.
  if (hits.size > 5000)
    for (const [k, v] of hits)
      if (v.every((t) => now - t > windowMs)) {
        hits.delete(k);
        warned.delete(k);
      }

  return { ok: true, remaining: limit - recent.length, retryAfter: 0 };
}

export const clientKey = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
  req.headers.get("x-real-ip") ??
  "anon";
