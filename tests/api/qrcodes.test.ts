import { describe, it, expect, beforeEach, vi } from "vitest";
import { setDb } from "../helpers/route";
import { jsonRequest, ctx } from "../helpers/request";
import { isUrlSafe } from "@/lib/safe-browsing";
import * as route from "@/app/api/v1/qrcodes/route";

const USER = "user-1";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_REDIRECT_DOMAIN", "https://qr.test");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.test");
});

describe("POST /api/v1/qrcodes", () => {
  it("creates a code and returns the UUID, tracking_url and qr_svg_url", async () => {
    const row = {
      id: "8f3c0b2e-4d1a-4c9b-9f2e-1a2b3c4d5e6f",
      short_slug: "a1B2c3",
      destination_url: "https://example.com",
      name: "Campaign",
      folder_id: null,
      tags: [],
      is_active: true,
      created_at: "2026-06-14T00:00:00.000Z",
    };
    setDb([{ data: row }]);

    const res = await route.POST(jsonRequest("POST", { destination_url: "https://example.com", name: "Campaign" }), ctx());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(row.id);
    expect(body.short_slug).toBe("a1B2c3");
    expect(body.tracking_url).toMatch(/^https:\/\/qr\.test\/r\/[A-Za-z0-9_-]+$/);
    expect(body.qr_svg_url).toBe(`https://app.test/api/v1/qrcodes/${row.id}/qr.svg`);
    // Internal columns are not leaked.
    expect(body).not.toHaveProperty("user_id");
  });

  it("rejects an invalid body with 400", async () => {
    setDb([]);
    const res = await route.POST(jsonRequest("POST", { name: "no url" }), ctx());
    expect(res.status).toBe(400);
  });

  it("rejects a malformed JSON body with 400", async () => {
    setDb([]);
    const bad = new Request("http://test.local/api/v1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    const res = await route.POST(bad, ctx());
    expect(res.status).toBe(400);
  });

  it("rejects an unsafe destination with 400", async () => {
    setDb([]);
    vi.mocked(isUrlSafe).mockResolvedValueOnce(false);
    const res = await route.POST(jsonRequest("POST", { destination_url: "https://malware.test" }), ctx());
    expect(res.status).toBe(400);
  });

  it("rejects an unsafe A/B destination with 400", async () => {
    setDb([]);
    // Screening order: destination_url, then each A/B arm.
    vi.mocked(isUrlSafe)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const res = await route.POST(
      jsonRequest("POST", {
        destination_url: "https://ok.test",
        ab_destinations: [
          { url: "https://ok2.test", weight: 50 },
          { url: "https://malware.test", weight: 50 },
        ],
      }),
      ctx(),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a folder the caller does not own with 400", async () => {
    setDb([{ data: null }]); // folder ownership lookup finds nothing
    const res = await route.POST(
      jsonRequest("POST", {
        destination_url: "https://example.com",
        folder_id: "22222222-2222-4222-8222-222222222222",
      }),
      ctx(),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Folder not found");
  });
});

describe("GET /api/v1/qrcodes", () => {
  it("lists the caller's codes", async () => {
    const rows = [{ id: "1", short_slug: "x" }];
    setDb([{ data: rows }]);
    const res = await route.GET(jsonRequest("GET"), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rows);
  });

  it("scopes the query to the caller (user_id)", async () => {
    const mock = setDb([{ data: [] }]);
    await route.GET(jsonRequest("GET"), ctx());
    expect(mock.calls).toContainEqual(expect.objectContaining({ method: "eq", args: ["user_id", USER] }));
  });

  it("applies ?limit/?offset as an explicit range", async () => {
    const mock = setDb([{ data: [] }]);
    await route.GET(
      jsonRequest("GET", undefined, "http://test.local/api/v1/qrcodes?limit=10&offset=20"),
      ctx(),
    );
    expect(mock.calls).toContainEqual(expect.objectContaining({ method: "range", args: [20, 29] }));
  });

  it("defaults to the first 1000 rows", async () => {
    const mock = setDb([{ data: [] }]);
    await route.GET(jsonRequest("GET"), ctx());
    expect(mock.calls).toContainEqual(expect.objectContaining({ method: "range", args: [0, 999] }));
  });
});
