import { describe, it, expect, beforeEach, vi } from "vitest";
import { setDb } from "../helpers/route";
import { authState } from "../helpers/auth-state";
import { jsonRequest, ctx } from "../helpers/request";
import * as analytics from "@/app/api/v1/qrcodes/[id]/analytics/route";
import * as qrsvg from "@/app/api/v1/qrcodes/[id]/qr.svg/route";
import * as exportRoute from "@/app/api/v1/qrcodes/export/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_REDIRECT_DOMAIN", "https://qr.test");
});

describe("GET /api/v1/qrcodes/[id]/analytics", () => {
  it("returns a timeseries", async () => {
    setDb([{ data: [{ day: "2026-06-01", scans: 5 }] }]);
    const res = await analytics.GET(
      jsonRequest("GET", undefined, "http://test.local/api/v1/qrcodes/abc/analytics?days=7"),
      ctx({ id: "abc" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.days).toBe(7);
    expect(body.series).toHaveLength(1);
  });

  it("maps an ownership failure to 403", async () => {
    setDb([{ error: { message: "Forbidden: not owner" } }]);
    const res = await analytics.GET(jsonRequest("GET"), ctx({ id: "abc" }));
    expect(res.status).toBe(403);
  });

  it("uses the service-role RPC (with the key's user id) under API-key auth", async () => {
    const mock = setDb([{ data: [] }]);
    authState.current.authType = "apikey";
    const res = await analytics.GET(jsonRequest("GET"), ctx({ id: "abc" }));
    expect(res.status).toBe(200);
    expect(mock.calls).toContainEqual(
      expect.objectContaining({
        method: "rpc",
        args: ["get_scan_timeseries_svc", expect.objectContaining({ p_user_id: "user-1" })],
      }),
    );
  });
});

describe("GET /api/v1/qrcodes/[id]/qr.svg", () => {
  it("returns an SVG by default", async () => {
    setDb([{ data: { short_slug: "abc" } }]);
    const res = await qrsvg.GET(jsonRequest("GET"), ctx({ id: "abc" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
  });

  it("returns a PNG when ?format=png", async () => {
    setDb([{ data: { short_slug: "abc" } }]);
    const res = await qrsvg.GET(
      jsonRequest("GET", undefined, "http://test.local/api/v1/qrcodes/abc/qr.svg?format=png"),
      ctx({ id: "abc" }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 404 for a code the caller does not own", async () => {
    setDb([{ data: null }]);
    const res = await qrsvg.GET(jsonRequest("GET"), ctx({ id: "missing" }));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/v1/qrcodes/export", () => {
  it("streams CSV with a header row", async () => {
    setDb([
      {
        data: [
          { name: "A", short_slug: "a", destination_url: "https://a.test", scan_count: 3, is_active: true, tags: ["x"], created_at: "2026-01-01" },
        ],
      },
    ]);
    const res = await exportRoute.GET(jsonRequest("GET"), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const text = await res.text();
    expect(text.split("\n")[0]).toContain("tracking_url");
    expect(text).toContain("/r/a"); // tracking_url column built from the slug
  });
});
