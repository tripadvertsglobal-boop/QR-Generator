import { describe, it, expect } from "vitest";
import { limitsFor, isPlan, PLAN_LIMITS } from "@/lib/plan";

describe("plan limits", () => {
  it("treats an unknown or missing plan as free — fail closed", () => {
    expect(limitsFor(undefined)).toBe(PLAN_LIMITS.free);
    expect(limitsFor(null)).toBe(PLAN_LIMITS.free);
    expect(limitsFor("enterprise")).toBe(PLAN_LIMITS.free);
    expect(limitsFor("")).toBe(PLAN_LIMITS.free);
  });

  it("resolves each known tier", () => {
    expect(limitsFor("free")).toBe(PLAN_LIMITS.free);
    expect(limitsFor("pro")).toBe(PLAN_LIMITS.pro);
    expect(limitsFor("business")).toBe(PLAN_LIMITS.business);
  });

  it("gates the paid features on free", () => {
    const free = PLAN_LIMITS.free;
    expect(free.maxQrCodes).toBe(10);
    expect(free.maxFolders).toBe(1);
    expect(free.apiAccess).toBe(false);
    expect(free.bulkOperations).toBe(false);
    expect(free.geoAnalytics).toBe(false);
  });

  it("gives business a higher API rate limit than pro", () => {
    expect(PLAN_LIMITS.business.defaultKeyRateLimit).toBeGreaterThan(
      PLAN_LIMITS.pro.defaultKeyRateLimit,
    );
  });

  it("narrows plan strings", () => {
    expect(isPlan("pro")).toBe(true);
    expect(isPlan("gold")).toBe(false);
  });
});
