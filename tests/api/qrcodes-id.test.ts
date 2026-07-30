import { describe, it, expect, beforeEach, vi } from "vitest";
import { setDb } from "../helpers/route";
import { jsonRequest, ctx } from "../helpers/request";
import { isUrlSafe } from "@/lib/safe-browsing";
import * as route from "@/app/api/v1/qrcodes/[id]/route";
import { RES_ID, MISSING_ID, NOT_A_UUID } from "../helpers/ids";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_REDIRECT_DOMAIN", "https://qr.test");
});

describe("GET /api/v1/qrcodes/[id]", () => {
  it("returns the code without its password hash", async () => {
    setDb([
      {
        data: {
          id: "abc",
          short_slug: "s",
          destination_url: "https://old.test",
          password_hash: "$2a$10$secret",
        },
      },
    ]);
    const res = await route.GET(jsonRequest("GET"), ctx({ id: RES_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.short_slug).toBe("s");
    expect(body).not.toHaveProperty("password_hash");
  });

  it("returns an archived code", async () => {
    setDb([{ data: { id: "abc", short_slug: "s", archived_at: "2026-07-01T00:00:00.000Z" } }]);
    const res = await route.GET(jsonRequest("GET"), ctx({ id: RES_ID }));
    expect(res.status).toBe(200);
    expect((await res.json()).archived_at).toBe("2026-07-01T00:00:00.000Z");
  });

  it("returns 404 when the code is not found / not owned", async () => {
    setDb([{ data: null }]);
    const res = await route.GET(jsonRequest("GET"), ctx({ id: MISSING_ID }));
    expect(res.status).toBe(404);
  });

  it("404s a malformed id without touching the database", async () => {
    const mock = setDb([]);
    const res = await route.GET(jsonRequest("GET"), ctx({ id: NOT_A_UUID }));
    expect(res.status).toBe(404);
    expect(mock.calls).toHaveLength(0);
  });
});

describe("PATCH /api/v1/qrcodes/[id]", () => {
  it("updates a code and returns it", async () => {
    // First query snapshots the pre-update row for auditing, then the update.
    setDb([
      { data: { id: "abc", short_slug: "s", is_active: true, destination_url: "https://old.test" } },
      { data: { id: "abc", short_slug: "s", is_active: true, destination_url: "https://new.test" } },
    ]);
    const res = await route.PATCH(jsonRequest("PATCH", { destination_url: "https://new.test" }), ctx({ id: RES_ID }));
    expect(res.status).toBe(200);
    expect((await res.json()).destination_url).toBe("https://new.test");
  });

  it("returns 404 when the code is not found / not owned", async () => {
    setDb([{ data: null }, { error: { code: "PGRST116" } }]);
    const res = await route.PATCH(jsonRequest("PATCH", { name: "x" }), ctx({ id: MISSING_ID }));
    expect(res.status).toBe(404);
  });

  it("rejects an empty update with 400", async () => {
    setDb([]);
    const res = await route.PATCH(jsonRequest("PATCH", {}), ctx({ id: RES_ID }));
    expect(res.status).toBe(400);
  });

  it("rejects an unsafe A/B destination with 400", async () => {
    setDb([]);
    // No destination_url in the patch, so only the two A/B arms are screened.
    vi.mocked(isUrlSafe).mockResolvedValueOnce(false);
    const res = await route.PATCH(
      jsonRequest("PATCH", {
        ab_destinations: [
          { url: "https://malware.test", weight: 50 },
          { url: "https://ok.test", weight: 50 },
        ],
      }),
      ctx({ id: RES_ID }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a folder the caller does not own with 400", async () => {
    setDb([{ data: null }]); // folder ownership lookup finds nothing
    const res = await route.PATCH(
      jsonRequest("PATCH", { folder_id: "22222222-2222-4222-8222-222222222222" }),
      ctx({ id: RES_ID }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Folder not found");
  });
});

describe("DELETE /api/v1/qrcodes/[id]", () => {
  it("deletes a code", async () => {
    setDb([{ data: { short_slug: "s" } }]);
    const res = await route.DELETE(jsonRequest("DELETE"), ctx({ id: RES_ID }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("returns 404 when not found", async () => {
    setDb([{ error: { code: "PGRST116" } }]);
    const res = await route.DELETE(jsonRequest("DELETE"), ctx({ id: MISSING_ID }));
    expect(res.status).toBe(404);
  });
});

describe("route param validation", () => {
  it("404s a malformed id without touching the database", async () => {
    const mock = setDb([]);
    const res = await route.PATCH(
      jsonRequest("PATCH", { name: "x" }),
      ctx({ id: NOT_A_UUID }),
    );
    expect(res.status).toBe(404);
    // Previously this reached PostgREST and came back as a generic 400.
    expect(mock.calls).toHaveLength(0);
  });
});
