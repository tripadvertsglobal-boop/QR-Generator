// HMAC-signed unlock token for password-gated links. Created server-side (node)
// after a bcrypt check, verified at the edge via Web Crypto (no bcrypt needed
// on the redirect path). Token format: `<expiryMs>.<hmacHex>`.
// Fail closed: a missing secret in production would fall back to a public
// constant, letting anyone forge unlock cookies and bypass the password gate.
const CONFIGURED_SECRET = process.env.LINK_UNLOCK_SECRET;
if (!CONFIGURED_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("LINK_UNLOCK_SECRET must be set in production");
}
const SECRET = CONFIGURED_SECRET || "dev-insecure-unlock-secret";
const TTL_MS = 60 * 60 * 1000; // 1 hour

export const unlockCookieName = (slug: string) => `ul_${slug}`;

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toHex(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createUnlockToken(slug: string): Promise<string> {
  const exp = Date.now() + TTL_MS;
  return `${exp}.${await sign(`${slug}.${exp}`)}`;
}

export async function verifyUnlockToken(slug: string, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const exp = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return timingSafeEqual(sig, await sign(`${slug}.${exp}`));
}
