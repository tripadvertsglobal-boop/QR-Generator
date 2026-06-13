import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch seconds when the window rolls over
};

/**
 * Sliding-window rate limit over a 60s window using a Redis sorted set per
 * identity. Each request adds a timestamped member, expired members are pruned,
 * and the live count is compared to the limit. No-ops (always allows) when no
 * Redis is configured so local/CI runs aren't blocked.
 */
export async function checkRateLimit(
  identity: string,
  limit: number,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const reset = Math.ceil(Date.now() / 1000) + windowSeconds;
  if (!redis) return { ok: true, limit, remaining: limit, reset };

  const key = `rl:${identity}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const pipe = redis.pipeline();
  pipe.zremrangebyscore(key, 0, windowStart);
  pipe.zadd(key, { score: now, member: `${now}-${Math.random()}` });
  pipe.zcard(key);
  pipe.expire(key, windowSeconds);
  const res = (await pipe.exec()) as [unknown, unknown, number, unknown];

  const count = res[2] ?? 0;
  const remaining = Math.max(0, limit - count);
  return { ok: count <= limit, limit, remaining, reset };
}
