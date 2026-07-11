import { describe, it, expect } from "vitest";
import { isBotUserAgent, hashIp } from "@/lib/scan-agent";

describe("isBotUserAgent", () => {
  it("treats missing or empty UA as bot", () => {
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent(undefined)).toBe(true);
    expect(isBotUserAgent("")).toBe(true);
    expect(isBotUserAgent("   ")).toBe(true);
  });

  it("flags crawlers, preview bots, and monitors", () => {
    for (const ua of [
      "facebookexternalhit/1.1",
      "WhatsApp/2.23",
      "Slackbot-LinkExpanding 1.0",
      "TelegramBot (like TwitterBot)",
      "Mozilla/5.0 (compatible; Googlebot/2.1)",
      "curl/8.4.0",
      "python-requests/2.31.0",
      "Mozilla/5.0 (compatible; UptimeRobot/2.0)",
    ]) {
      expect(isBotUserAgent(ua), ua).toBe(true);
    }
  });

  it("allows real phone/desktop browsers", () => {
    for (const ua of [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    ]) {
      expect(isBotUserAgent(ua), ua).toBe(false);
    }
  });
});

describe("hashIp", () => {
  it("is deterministic and non-reversible-looking", async () => {
    const a = await hashIp("203.0.113.7");
    const b = await hashIp("203.0.113.7");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("203.0.113.7");
  });

  it("differs per IP", async () => {
    expect(await hashIp("203.0.113.7")).not.toBe(await hashIp("203.0.113.8"));
  });
});
