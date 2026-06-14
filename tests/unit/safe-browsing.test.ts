import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("isUrlSafe", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("no-ops to safe when no API key is configured", async () => {
    const { isUrlSafe } = await import("@/lib/safe-browsing");
    expect(await isUrlSafe("https://anything.com")).toBe(true);
  });

  it("returns false when Safe Browsing reports a threat match", async () => {
    vi.stubEnv("SAFE_BROWSING_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ matches: [{ threatType: "MALWARE" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
    const { isUrlSafe } = await import("@/lib/safe-browsing");
    expect(await isUrlSafe("https://evil.com")).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns true when there are no matches", async () => {
    vi.stubEnv("SAFE_BROWSING_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    vi.resetModules();
    const { isUrlSafe } = await import("@/lib/safe-browsing");
    expect(await isUrlSafe("https://good.com")).toBe(true);
  });

  it("fails open (safe) when the API errors", async () => {
    vi.stubEnv("SAFE_BROWSING_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    vi.resetModules();
    const { isUrlSafe } = await import("@/lib/safe-browsing");
    expect(await isUrlSafe("https://x.com")).toBe(true);
  });
});
