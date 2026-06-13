import { createHash, randomBytes } from "node:crypto";

const PREFIX = "qr_sk_";
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

// `qr_sk_<32 random chars>`. The `qr_sk_` prefix lets secret scanners flag leaks.
function randomBody(len: number): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = PREFIX + randomBody(32);
  return { raw, hash: hashKey(raw), prefix: raw.slice(0, 12) };
}
