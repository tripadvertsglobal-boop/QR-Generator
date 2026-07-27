import { describe, it, expect, beforeAll, vi } from "vitest";

// Auth resolution is stubbed to "no user", so a request that clears the CSRF
// gate lands on 401. That keeps the assertions about the gate alone: 403 means
// rejected by CSRF, anything else means it passed.
vi.mock("@/lib/supabase/server", () => ({
  createUserClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

vi.mock("@/lib/supabase/service", () => {
  const builder: Record<string, unknown> = {};
  for (const m of ["from", "select", "eq", "update"]) builder[m] = () => builder;
  builder.maybeSingle = async () => ({ data: null, error: null });
  return { createServiceClient: () => builder };
});

const { withAuth } = await import("@/lib/auth");

const ok = withAuth(async () => new Response("handled", { status: 200 }));

beforeAll(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
});

const post = (headers: Record<string, string> = {}) =>
  new Request("https://app.test/api/v1/qrcodes", { method: "POST", headers });

describe("withAuth CSRF gate", () => {
  it("rejects a cookie-authenticated mutation from a foreign origin", async () => {
    const res = await ok(post({ origin: "https://evil.test" }), {});
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Cross-origin request rejected" });
  });

  it("allows a mutation from the app's own origin", async () => {
    const res = await ok(post({ origin: "https://app.test" }), {});
    expect(res.status).toBe(401);
  });

  it("allows a non-browser caller that sends no Origin", async () => {
    // curl and server-to-server clients omit Origin; browsers always send it on
    // a non-simple request, so absence cannot be a CSRF attempt.
    const res = await ok(post(), {});
    expect(res.status).toBe(401);
  });

  it("does not apply to callers presenting an explicit credential", async () => {
    // An API key is not ambient: it cannot be attached by a cross-site page.
    const res = await ok(post({ origin: "https://evil.test", "x-api-key": "qr_sk_x" }), {});
    expect(res.status).toBe(401);
  });

  it("does not apply to safe methods", async () => {
    const res = await ok(
      new Request("https://app.test/api/v1/qrcodes", {
        method: "GET",
        headers: { origin: "https://evil.test" },
      }),
      {},
    );
    expect(res.status).toBe(401);
  });
});
