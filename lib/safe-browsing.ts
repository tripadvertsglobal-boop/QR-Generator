import { Redis } from "@upstash/redis";
import { log } from "@/lib/log";

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;
const apiKey = process.env.SAFE_BROWSING_API_KEY;

// Warn once at startup if screening is disabled in production, so a missing key
// is observable rather than silently allowing every URL.
if (!apiKey && process.env.NODE_ENV === "production") {
  log("warn", "safe_browsing_disabled", { reason: "SAFE_BROWSING_API_KEY not set" });
}

const CACHE_TTL = 60 * 30; // 30 min

/**
 * Returns true if the URL is safe (or cannot be checked). Uses Google Safe
 * Browsing v4 Lookup, cached in KV for 30 min. If no API key is configured the
 * check is a no-op (treats everything as safe) so the feature can ship dark.
 */
export async function isUrlSafe(targetUrl: string): Promise<boolean> {
  if (!apiKey) return true;

  const cacheKey = `safe:${targetUrl}`;
  if (redis) {
    const cached = await redis.get<"1" | "0">(cacheKey);
    if (cached === "1") return true;
    if (cached === "0") return false;
  }

  let safe = true;
  try {
    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "qrgenerator", clientVersion: "1.0.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url: targetUrl }],
          },
        }),
      },
    );
    if (res.ok) {
      const body = await res.json();
      safe = !body.matches || body.matches.length === 0;
    }
  } catch (err) {
    // On API failure, fail open (treat as safe) — never block on an outage, but
    // log it so the gap is visible.
    log("warn", "safe_browsing_error", { error: err instanceof Error ? err.message : String(err) });
    safe = true;
  }

  if (redis) await redis.set(cacheKey, safe ? "1" : "0", { ex: CACHE_TTL });
  return safe;
}
