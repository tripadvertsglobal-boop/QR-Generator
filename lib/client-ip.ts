import type { NextRequest } from "next/server";

/**
 * Client IP for rate limiting, scan dedup, and audit records.
 *
 * `x-forwarded-for` is a *client-supplied* header. Whatever the caller sends is
 * preserved to the LEFT of the values appended by the proxy chain, so the
 * leftmost entry is attacker-controlled — reading it lets anyone rotate a fake
 * IP to bypass every per-IP limit and to defeat scan dedup.
 *
 * Preference order:
 *  1. `cf-connecting-ip` — Cloudflare's own record of the connecting client,
 *     overwritten by the edge on every request so it cannot be spoofed.
 *  2. `x-real-ip` — a single value written by the platform edge, not appendable.
 *  3. `x-vercel-forwarded-for` — Vercel's own record of the connecting client.
 *  4. the RIGHTMOST `x-forwarded-for` entry — the hop appended by the proxy
 *     directly in front of us, i.e. the last one a client could not have forged.
 *
 * Returns null when no header is usable, so callers can decide whether to skip
 * (dedup) or bucket as unknown (rate limiting).
 */
export function clientIp(request: Request | NextRequest): string | null {
  const cloudflare = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflare) return cloudflare;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const vercel = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (vercel) return lastEntry(vercel);

  const forwarded = request.headers.get("x-forwarded-for")?.trim();
  if (forwarded) return lastEntry(forwarded);

  return null;
}

function lastEntry(header: string): string | null {
  const parts = header
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}
