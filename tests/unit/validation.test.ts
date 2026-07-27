import { describe, it, expect } from "vitest";
import {
  createQrSchema,
  updateQrSchema,
  createWebhookSchema,
  updateWebhookSchema,
  createKeySchema,
  isUuid,
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
    ).toBe(false);
    expect(
      createQrSchema.safeParse({ destination_url: "https://x.com", password: "abcdefgh" }).success,
    ).toBe(true);
  });
  it("rejects an active window that ends before it starts", () => {
    expect(
      createQrSchema.safeParse({
        destination_url: "https://x.com",
        active_from: "2026-07-10T00:00:00.000Z",
        active_until: "2026-07-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
    expect(
      createQrSchema.safeParse({
        destination_url: "https://x.com",
        active_from: "2026-07-01T00:00:00.000Z",
        active_until: "2026-07-10T00:00:00.000Z",
      }).success,
    ).toBe(true);
  });
  it("accepts a single-ended active window", () => {
    expect(
      createQrSchema.safeParse({
        destination_url: "https://x.com",
        active_from: "2026-07-01T00:00:00.000Z",
      }).success,
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
  it("rejects an active window that ends before it starts", () => {
    expect(
      updateQrSchema.safeParse({
        active_from: "2026-07-10T00:00:00.000Z",
        active_until: "2026-07-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});

describe("updateWebhookSchema", () => {
  it("requires a boolean is_active", () => {
    expect(updateWebhookSchema.safeParse({ is_active: true }).success).toBe(true);
    expect(updateWebhookSchema.safeParse({ is_active: "yes" }).success).toBe(false);
    expect(updateWebhookSchema.safeParse({}).success).toBe(false);
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

describe("isUuid", () => {
  it("accepts the hyphenated UUIDs the API issues", () => {
    expect(isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isUuid("A1B2C3D4-E5F6-7890-ABCD-EF1234567890")).toBe(true);
  });

  it("rejects anything Postgres would fail to cast", () => {
    // Each of these reached .eq("id", …) before and surfaced as a generic 400.
    expect(isUuid("abc")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("11111111-1111-4111-8111-11111111111")).toBe(false); // too short
    expect(isUuid("11111111-1111-4111-8111-111111111111x")).toBe(false);
    expect(isUuid("1111111g-1111-4111-8111-111111111111")).toBe(false); // non-hex
    expect(isUuid("11111111111141118111111111111111")).toBe(false); // unhyphenated
  });
});
