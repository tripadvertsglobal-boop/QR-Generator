import { describe, it, expect, vi, afterEach } from "vitest";
import { isPublicWebhookUrl } from "@/lib/ssrf";

describe("isPublicWebhookUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rejects non-http(s) and malformed URLs", () => {
    expect(isPublicWebhookUrl("ftp://x.com")).toBe(false);
    expect(isPublicWebhookUrl("not a url")).toBe(false);
  });

  it("allows public hosts", () => {
    expect(isPublicWebhookUrl("https://hooks.example.com/x")).toBe(true);
  });

  describe("in production", () => {
    it("blocks loopback, private ranges, and cloud metadata", () => {
      vi.stubEnv("NODE_ENV", "production");
      for (const u of [
        "http://localhost:4000/h",
        "http://127.0.0.1/h",
        "http://10.0.0.5/h",
        "http://192.168.1.1/h",
        "http://172.16.0.1/h",
        "http://169.254.169.254/latest/meta-data",
        "http://metadata.google.internal/x",
        "http://[::1]/h",
      ]) {
        expect(isPublicWebhookUrl(u), u).toBe(false);
      }
      expect(isPublicWebhookUrl("https://hooks.example.com/x")).toBe(true);
    });
  });
});
