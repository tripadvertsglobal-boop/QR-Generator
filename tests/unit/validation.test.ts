import { describe, it, expect } from "vitest";
import {
  createQrSchema,
  updateQrSchema,
  createWebhookSchema,
  createKeySchema,
} from "@/lib/validation";

describe("createQrSchema", () => {
  it("accepts a valid http(s) URL", () => {
    expect(createQrSchema.safeParse({ destination_url: "https://example.com" }).success).toBe(true);
  });
  it("rejects non-http URLs and garbage", () => {
    expect(createQrSchema.safeParse({ destination_url: "ftp://x" }).success).toBe(false);
    expect(createQrSchema.safeParse({ destination_url: "not a url" }).success).toBe(false);
  });
  it("rejects an A/B split with fewer than two arms", () => {
    const r = createQrSchema.safeParse({
      destination_url: "https://x.com",
      ab_destinations: [{ url: "https://a.com", weight: 100 }],
    });
    expect(r.success).toBe(false);
  });
  it("enforces password minimum length", () => {
    expect(
      createQrSchema.safeParse({ destination_url: "https://x.com", password: "ab" }).success,
    ).toBe(false);
    expect(
      createQrSchema.safeParse({ destination_url: "https://x.com", password: "abcd" }).success,
    ).toBe(true);
  });
});

describe("updateQrSchema", () => {
  it("rejects an empty patch", () => {
    expect(updateQrSchema.safeParse({}).success).toBe(false);
  });
  it("accepts a single field", () => {
    expect(updateQrSchema.safeParse({ is_active: false }).success).toBe(true);
  });
});

describe("createWebhookSchema", () => {
  it("accepts known events", () => {
    expect(
      createWebhookSchema.safeParse({ url: "https://h.com", events: ["qr.created", "scan.threshold"] })
        .success,
    ).toBe(true);
  });
  it("rejects unknown events and empty event lists", () => {
    expect(createWebhookSchema.safeParse({ url: "https://h.com", events: ["nope"] }).success).toBe(false);
    expect(createWebhookSchema.safeParse({ url: "https://h.com", events: [] }).success).toBe(false);
  });
});

describe("createKeySchema", () => {
  it("only allows qrcodes scopes", () => {
    expect(createKeySchema.safeParse({ name: "k", scopes: ["qrcodes:read"] }).success).toBe(true);
    expect(createKeySchema.safeParse({ name: "k", scopes: ["keys:write"] }).success).toBe(false);
  });
});
