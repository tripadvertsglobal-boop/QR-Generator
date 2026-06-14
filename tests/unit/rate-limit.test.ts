import { describe, it, expect } from "vitest";
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
