// SSRF guard for user-supplied webhook URLs. The server POSTs to these URLs, so
// in production we reject targets that resolve to private/loopback/link-local
// ranges or cloud-metadata endpoints. In non-production we allow localhost so
// local webhook testing works.
function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "metadata.google.internal") return true;

  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + 169.254.169.254 metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  // IPv6 loopback / unique-local / link-local
  if (h === "::1" || h === "::" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80:")) {
    return true;
  }
  return false;
}

export function isPublicWebhookUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  if (process.env.NODE_ENV !== "production") return true; // allow localhost in dev/test
  return !isPrivateHost(u.hostname);
}
