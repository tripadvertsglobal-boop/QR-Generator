import { describe, it, expect, vi } from "vitest";

// webhooks.ts imports `after` from next/server; stub it for the unit test.
vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));

import { crossedMilestone } from "@/lib/webhooks";

describe("crossedMilestone", () => {
  it("detects the first milestone crossed", () => {
    expect(crossedMilestone(9, 10)).toBe(10);
    expect(crossedMilestone(0, 10)).toBe(10);
    expect(crossedMilestone(49, 51)).toBe(50);
    expect(crossedMilestone(99, 100)).toBe(100);
  });
  it("returns null when no milestone is crossed", () => {
    expect(crossedMilestone(10, 11)).toBeNull();
    expect(crossedMilestone(100, 150)).toBeNull();
    expect(crossedMilestone(0, 9)).toBeNull();
  });
});
