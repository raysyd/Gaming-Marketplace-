/**
 * Rate limiter. With UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set
 * (or KV_REST_API_URL + KV_REST_API_TOKEN, the names the Vercel Marketplace
 * Upstash integration injects), the counter lives in Upstash Redis, shared
 * by every serverless instance (a fixed window: INCR + EXPIRE in one
 * pipeline). Without them — or if Redis doesn't answer within a second — it
 * falls back to the in-memory sliding window below, which only limits
 * within one warm instance: fine for local dev, not a real limit on Vercel.
 */
const hits = new Map<string, number[]>();
// Which keys already got one "rate limited" log line for their current
// block — without this, a real flood (the actual case this exists to
// catch) would itself flood the log with one line per rejected request,
// burying the one signal ("someone's hammering X") in noise.
const warned = new Set<string>();

type Limited = { ok: boolean; remaining: number; retryAfter: number };

const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)?.replace(/\/$/, "");
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redisLimit(key: string, limit: number, windowMs: number): Promise<Limited | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const windowS = Math.ceil(windowMs / 1000);
  const bucket = Math.floor(Date.now() / windowMs);
  const redisKey = `rl:${key}:${bucket}`;
  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${REDIS_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(windowS), "NX"],
      ]),
      signal: AbortSignal.timeout(1000),
    });
    if (!res.ok) return null;
    const [incr] = (await res.json()) as { result?: number }[];
    const count = Number(incr?.result);
    if (!Number.isFinite(count)) return null;
    if (count > limit) {
      if (count === limit + 1)
        console.warn(`[rate-limit] blocked "${key}" — over ${limit} requests in ${windowS}s.`);
      const retryAfter = Math.max(1, Math.ceil(((bucket + 1) * windowMs - Date.now()) / 1000));
      return { ok: false, remaining: 0, retryAfter };
    }
    return { ok: true, remaining: limit - count, retryAfter: 0 };
  } catch {
    return null;
  }
}

export async function rateLimit(
  key: string,
  { limit = 20, windowMs = 60_000 } = {}
): Promise<Limited> {
  return (await redisLimit(key, limit, windowMs)) ?? memoryLimit(key, limit, windowMs);
}

function memoryLimit(key: string, limit: number, windowMs: number): Limited {
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
