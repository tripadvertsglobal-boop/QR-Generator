import { describe, it, expect } from "vitest";
import { checkoutPlan, afterAuthPath } from "@/lib/checkout-intent";

describe("checkoutPlan", () => {
  it("accepts the plans the app sells", () => {
    expect(checkoutPlan("pro")).toBe("pro");
    expect(checkoutPlan("business")).toBe("business");
  });

  it("rejects anything else", () => {
    expect(checkoutPlan("free")).toBeNull();
    expect(checkoutPlan("")).toBeNull();
    expect(checkoutPlan(null)).toBeNull();
    expect(checkoutPlan(undefined)).toBeNull();
    expect(checkoutPlan("PRO")).toBeNull();
  });

  // The reason this is a closed set rather than a `next` path: none of these can
  // survive narrowing, so no caller has to remember to validate an origin.
  it("cannot be used to smuggle a redirect target", () => {
    for (const attack of [
      "https://evil.test",
      "//evil.test",
      "/dashboard",
      "pro?x=https://evil.test",
      "javascript:alert(1)",
      "../../etc/passwd",
    ]) {
      expect(checkoutPlan(attack)).toBeNull();
      expect(afterAuthPath(checkoutPlan(attack))).toBe("/dashboard");
    }
  });
});

describe("afterAuthPath", () => {
  it("returns to pricing to finish the purchase", () => {
    expect(afterAuthPath("pro")).toBe("/pricing?checkout=pro");
    expect(afterAuthPath("business")).toBe("/pricing?checkout=business");
  });

  it("falls back to the dashboard with no intent", () => {
    expect(afterAuthPath(null)).toBe("/dashboard");
  });
});
