import { describe, it, expect, vi } from "vitest";
import { scheduleState, pickDestination, buildConfig, isLive, type SlugConfig } from "@/lib/slug-config";

const base: SlugConfig = {
  destination_url: "https://primary.example.com",
  is_active: true,
  active_from: null,
  active_until: null,
  has_password: false,
  ab: null,
};

describe("scheduleState", () => {
  it("ok when active and no window", () => {
    expect(scheduleState(base)).toBe("ok");
  });
  it("paused when inactive", () => {
    expect(scheduleState({ ...base, is_active: false })).toBe("paused");
  });
  it("not_started before active_from", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(scheduleState({ ...base, active_from: future })).toBe("not_started");
  });
  it("expired after active_until", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(scheduleState({ ...base, active_until: past })).toBe("expired");
  });
  it("ok inside the window", () => {
    const from = new Date(Date.now() - 60_000).toISOString();
    const until = new Date(Date.now() + 60_000).toISOString();
    expect(scheduleState({ ...base, active_from: from, active_until: until })).toBe("ok");
  });
});

describe("pickDestination", () => {
  it("returns primary when no A/B", () => {
    expect(pickDestination(base)).toBe("https://primary.example.com");
  });
  it("returns primary when weights sum to zero", () => {
    expect(pickDestination({ ...base, ab: [{ url: "https://a", weight: 0 }] })).toBe(
      "https://primary.example.com",
    );
  });
  it("always picks an A/B arm (never the primary) when configured", () => {
    const cfg = { ...base, ab: [{ url: "https://a", weight: 50 }, { url: "https://b", weight: 50 }] };
    for (let i = 0; i < 50; i++) {
      expect(["https://a", "https://b"]).toContain(pickDestination(cfg));
    }
  });
  it("respects weight via random", () => {
    const cfg = { ...base, ab: [{ url: "https://a", weight: 10 }, { url: "https://b", weight: 90 }] };
    const r = vi.spyOn(Math, "random").mockReturnValue(0.0); // first arm
    expect(pickDestination(cfg)).toBe("https://a");
    r.mockReturnValue(0.99); // last arm
    expect(pickDestination(cfg)).toBe("https://b");
    r.mockRestore();
  });
});

describe("buildConfig", () => {
  it("derives has_password and maps ab_destinations", () => {
    const cfg = buildConfig({
      destination_url: "https://x",
      is_active: true,
      password_hash: "abc",
      ab_destinations: [{ url: "https://a", weight: 1 }],
    });
    expect(cfg.has_password).toBe(true);
    expect(cfg.ab).toEqual([{ url: "https://a", weight: 1 }]);
  });
  it("has_password false when null", () => {
    expect(buildConfig({ destination_url: "https://x", is_active: true }).has_password).toBe(false);
  });
  // Archiving must reach the edge as "not live", so the cached config and
  // resolve_slug_config agree and the scan gets the 410 rather than a redirect.
  it("folds archived_at into is_active so an archived code resolves as paused", () => {
    const cfg = buildConfig({
      destination_url: "https://x",
      is_active: true,
      archived_at: "2026-07-01T00:00:00.000Z",
    });
    expect(cfg.is_active).toBe(false);
    expect(scheduleState(cfg)).toBe("paused");
  });
});

describe("isLive", () => {
  it("true only when active and not archived", () => {
    expect(isLive({ is_active: true, archived_at: null })).toBe(true);
    expect(isLive({ is_active: false, archived_at: null })).toBe(false);
    expect(isLive({ is_active: true, archived_at: "2026-07-01T00:00:00.000Z" })).toBe(false);
    expect(isLive({ is_active: false, archived_at: "2026-07-01T00:00:00.000Z" })).toBe(false);
  });
  it("treats a missing archived_at as not archived", () => {
    expect(isLive({ is_active: true })).toBe(true);
  });
});
