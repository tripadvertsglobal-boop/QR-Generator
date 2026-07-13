import { describe, it, expect, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

// In the test env no KV is configured, so the limiter no-ops (always allows).
// This guards the "fail open when KV is down/absent" behaviour.
describe("checkRateLimit (no KV configured)", () => {
  it("allows and reports full remaining", async () => {
    const r = await checkRateLimit("ip:1.2.3.4", 100);
    expect(r.ok).toBe(true);
    expect(r.limit).toBe(100);
    expect(r.remaining).toBe(100);
    expect(r.reset).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

// With KV configured but unreachable, the limiter must fail open — a Redis
// blip must not 500 every API request and redirect.
describe("checkRateLimit (KV configured but unreachable)", () => {
  it("allows when the Redis pipeline throws", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://kv.test");
    vi.stubEnv("KV_REST_API_TOKEN", "token");
    vi.doMock("@upstash/redis", () => ({
      Redis: class {
        pipeline() {
          throw new Error("connect ETIMEDOUT");
        }
      },
    }));
    vi.resetModules();
    const { checkRateLimit: check } = await import("@/lib/rate-limit");

    const r = await check("ip:1.2.3.4", 100);
    expect(r.ok).toBe(true);

    vi.doUnmock("@upstash/redis");
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
