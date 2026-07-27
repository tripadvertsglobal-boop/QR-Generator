import { describe, it, expect } from "vitest";
import { clientIp } from "@/lib/client-ip";

const req = (headers: Record<string, string>) =>
  new Request("https://app.test/x", { headers });

describe("clientIp", () => {
  it("prefers x-real-ip, which the platform sets and a client cannot append to", () => {
    expect(clientIp(req({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("ignores a client-forged leftmost x-forwarded-for entry", () => {
    // The attacker sends 1.2.3.4; the proxy appends the real 203.0.113.9.
    // Reading the leftmost value is what let a flood rotate past the limiter.
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("takes the rightmost entry through a multi-hop chain", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" }))).toBe("3.3.3.3");
  });

  it("prefers the platform header over x-forwarded-for", () => {
    expect(
      clientIp(req({ "x-vercel-forwarded-for": "198.51.100.7", "x-forwarded-for": "1.2.3.4" })),
    ).toBe("198.51.100.7");
  });

  it("returns null when no header is present", () => {
    expect(clientIp(req({}))).toBeNull();
  });

  it("returns null rather than an empty string for a blank header", () => {
    expect(clientIp(req({ "x-forwarded-for": " , " }))).toBeNull();
  });
});
