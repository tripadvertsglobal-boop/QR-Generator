// SSRF guard for user-supplied webhook URLs. The server POSTs to these URLs, so
// in production we reject targets that resolve to private/loopback/link-local
// ranges or cloud-metadata endpoints. In non-production we allow localhost so
// local webhook testing works.
import { lookup } from "node:dns/promises";

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

// Structural check: valid http(s) URL whose host is not a private/loopback IP
// *literal*. (The WHATWG URL parser normalizes hex/octal/decimal IPv4 forms to
// dotted-decimal, so those encodings are covered here.) Does NOT catch a public
// hostname that resolves to a private IP — use isPublicWebhookUrlResolved for
// that on the Node runtime.
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

// Structural check + DNS resolution: rejects a public hostname that resolves to
// a private/loopback/link-local address (SSRF). Fails closed when the host can't
// be resolved. Node runtime only (uses node:dns). Call this before registering a
// webhook. Note: this narrows the DNS-rebinding window but does not eliminate it
// (the record can change after this check) — dispatch also refuses redirects.
export async function isPublicWebhookUrlResolved(raw: string): Promise<boolean> {
  if (!isPublicWebhookUrl(raw)) return false;
  if (process.env.NODE_ENV !== "production") return true;

  let host: string;
  try {
    host = new URL(raw).hostname.replace(/^\[|\]$/g, "");
  } catch {
    return false;
  }

  try {
    const results = await lookup(host, { all: true });
    if (results.length === 0) return false;
    return results.every((r) => !isPrivateHost(r.address));
  } catch {
    return false; // unresolvable -> reject
  }
}
