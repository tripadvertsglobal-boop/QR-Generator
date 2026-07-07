import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", () => ({ NextResponse: class {} }));

describe("corsHeaders", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("reflects any origin when no allow-list is set", async () => {
    const { corsHeaders } = await import("@/lib/cors");
    expect(corsHeaders("https://anything.com")["Access-Control-Allow-Origin"]).toBe("https://anything.com");
    expect(corsHeaders(null)["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("omits ACAO in production when no allow-list is set (fail closed)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { corsHeaders } = await import("@/lib/cors");
    expect("Access-Control-Allow-Origin" in corsHeaders("https://anything.com")).toBe(false);
  });

  it("reflects only allow-listed origins, omits ACAO otherwise", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://allowed.example.com,https://ok.com");
    vi.resetModules();
    const { corsHeaders } = await import("@/lib/cors");
    expect(corsHeaders("https://allowed.example.com")["Access-Control-Allow-Origin"]).toBe(
      "https://allowed.example.com",
    );
    expect("Access-Control-Allow-Origin" in corsHeaders("https://evil.com")).toBe(false);
  });
});
