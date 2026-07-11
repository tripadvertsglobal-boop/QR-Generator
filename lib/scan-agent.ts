// Scan enrichment for the redirect path. Runs at the edge, so it stays
// dependency-free (Web-standard APIs only).

// Crawlers, link-preview/unfurl bots, and monitoring agents. When one of these
// fetches /r/<slug> — e.g. a link pasted into WhatsApp/Slack/iMessage fires a
// burst of preview fetches — we still resolve the redirect but do NOT count it
// as a scan. A real QR scan comes from a phone browser and always sends a UA;
// a missing/empty UA is treated as non-human.
const BOT_UA =
  /bot\b|crawl|spider|slurp|preview|fetch|monitor|uptime|ping|scanner|headless|phantom|puppeteer|playwright|curl|wget|python-requests|axios|go-http|java\/|okhttp|libwww|httpclient|facebookexternalhit|facebot|whatsapp|telegram|slack|discord|twitter|linkedin|embedly|pinterest|redditbot|applebot|bingbot|googlebot|google-safety|yandex|duckduckbot|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|ccbot|pingdom|statuscake|site24x7/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || !ua.trim()) return true;
  return BOT_UA.test(ua);
}

// Keyed hash so stored scan_logs.ip_hash can't be reversed to a raw IP, while
// staying stable enough to dedup repeat hits from the same source. Reuses the
// unlock secret (guaranteed in production) unless a dedicated salt is set.
const IP_SALT =
  process.env.SCAN_IP_SALT || process.env.LINK_UNLOCK_SECRET || "dev-insecure-scan-salt";

export async function hashIp(ip: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(IP_SALT),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
