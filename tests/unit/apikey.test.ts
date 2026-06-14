import { describe, it, expect } from "vitest";
import { generateApiKey, hashKey } from "@/lib/apikey";

describe("generateApiKey", () => {
  it("produces qr_sk_ + 32 chars, 12-char prefix", () => {
    const k = generateApiKey();
    expect(k.raw).toMatch(/^qr_sk_[0-9a-zA-Z]{32}$/);
    expect(k.raw.length).toBe(38);
    expect(k.prefix).toBe(k.raw.slice(0, 12));
  });
  it("hash matches hashKey(raw) and is sha-256 hex", () => {
    const k = generateApiKey();
    expect(k.hash).toBe(hashKey(k.raw));
    expect(k.hash).toMatch(/^[0-9a-f]{64}$/);
  });
  it("keys are unique", () => {
    const a = generateApiKey().raw;
    const b = generateApiKey().raw;
    expect(a).not.toBe(b);
  });
});

describe("hashKey", () => {
  it("is deterministic", () => {
    expect(hashKey("qr_sk_test")).toBe(hashKey("qr_sk_test"));
  });
});
