import { describe, it, expect, vi } from "vitest";
import { checkProductionConfig, assertProductionConfig, isPlaceholder } from "@/lib/env";

// site.config is mocked back to placeholders so these tests exercise the
// detection logic rather than whatever the shipped config happens to hold —
// the real one is asserted to be clean in its own test below.
vi.mock("@/site.config", () => ({
  siteConfig: {
    contact: { email: "TODO_SET_CONTACT_EMAIL", phone: "", address: "" },
  },
}));

const complete = {
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  NEXT_PUBLIC_REDIRECT_DOMAIN: "https://qr.test",
  NEXT_PUBLIC_APP_URL: "https://app.test",
  LINK_UNLOCK_SECRET: "secret",
  CRON_SECRET: "cron",
  KV_REST_API_URL: "https://kv",
  KV_REST_API_TOKEN: "kv",
  SAFE_BROWSING_API_KEY: "sb",
  SENTRY_DSN: "dsn",
  NEXT_PUBLIC_SENTRY_DSN: "dsn",
  ALLOWED_ORIGINS: "https://app.test",
};

describe("production config contract", () => {
  it("reports every missing required variable, not just the first", () => {
    const { errors } = checkProductionConfig({});
    for (const name of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "LINK_UNLOCK_SECRET",
      "CRON_SECRET",
    ]) {
      expect(errors.some((e) => e.includes(name))).toBe(true);
    }
  });

  it("treats a whitespace-only value as unset", () => {
    const { errors } = checkProductionConfig({ ...complete, LINK_UNLOCK_SECRET: "   " });
    expect(errors.some((e) => e.includes("LINK_UNLOCK_SECRET"))).toBe(true);
  });

  it("warns without failing when an optional safety net is off", () => {
    const { errors, warnings } = checkProductionConfig({
      ...complete,
      SAFE_BROWSING_API_KEY: undefined,
    });
    expect(warnings.some((w) => w.includes("SAFE_BROWSING_API_KEY"))).toBe(true);
    // Missing screening degrades the app; it must not block a deploy.
    expect(errors.some((e) => e.includes("SAFE_BROWSING_API_KEY"))).toBe(false);
  });

  it("fails while site.config still holds placeholder contact details", () => {
    // This is the guard that stops a fake address shipping in the Terms.
    const { errors } = checkProductionConfig(complete);
    expect(errors.some((e) => e.includes("siteConfig.contact"))).toBe(true);
    expect(() => assertProductionConfig(complete)).toThrow(/Production configuration is incomplete/);
  });

  it("downgrades the placeholder contact check to a warning under ALLOW_PLACEHOLDER_CONTACT", () => {
    const env = { ...complete, ALLOW_PLACEHOLDER_CONTACT: "1" };
    const { errors, warnings } = checkProductionConfig(env);
    expect(warnings.some((w) => w.includes("siteConfig.contact"))).toBe(true);
    expect(errors.some((e) => e.includes("siteConfig.contact"))).toBe(false);
    expect(() => assertProductionConfig(env)).not.toThrow();
  });

  it("does not let the escape hatch excuse a missing required secret", () => {
    const { errors } = checkProductionConfig({
      ...complete,
      ALLOW_PLACEHOLDER_CONTACT: "1",
      LINK_UNLOCK_SECRET: undefined,
    });
    expect(errors.some((e) => e.includes("LINK_UNLOCK_SECRET"))).toBe(true);
  });

  it("recognises the placeholder prefix", () => {
    expect(isPlaceholder("TODO_SET_CONTACT_EMAIL")).toBe(true);
    expect(isPlaceholder("hello@example.com")).toBe(false);
  });

  it("ships a site.config with no placeholder contact details left", async () => {
    // Guards the real config, which the mock above deliberately hides.
    const { siteConfig } = await vi.importActual<typeof import("@/site.config")>("@/site.config");
    for (const [field, value] of Object.entries(siteConfig.contact)) {
      expect(isPlaceholder(value), `siteConfig.contact.${field}`).toBe(false);
    }
    // The address of record in the Terms must be reachable.
    expect(siteConfig.contact.email).toMatch(/.+@.+\..+/);
  });
});
