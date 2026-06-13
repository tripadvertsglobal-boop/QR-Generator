import { Redis } from "@upstash/redis";

/**
 * Thin Redis wrapper over the maintained `@upstash/redis` client, reading the
 * standard `KV_REST_API_URL` / `KV_REST_API_TOKEN` vars that both a Vercel KV
 * store and an Upstash Marketplace integration inject. If neither is set, the
 * helpers no-op / return null so the redirect engine falls back to Supabase —
 * which keeps local dev working before any Redis store is provisioned.
 */
const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

export const kvEnabled = redis !== null;

const slugKey = (slug: string) => `slug:${slug}`;

export async function getDestination(slug: string): Promise<string | null> {
  if (!redis) return null;
  return redis.get<string>(slugKey(slug));
}

export async function setDestination(
  slug: string,
  destination: string,
  ttlSeconds?: number,
): Promise<void> {
  if (!redis) return;
  await redis.set(slugKey(slug), destination, ttlSeconds ? { ex: ttlSeconds } : undefined);
}

export async function delDestination(slug: string): Promise<void> {
  if (!redis) return;
  await redis.del(slugKey(slug));
}
