import { describe, it, expect, beforeEach, vi } from "vitest";
import { setDb } from "../helpers/route";
import { jsonRequest, ctx } from "../helpers/request";
import { isUrlSafe } from "@/lib/safe-browsing";
import * as route from "@/app/api/v1/qrcodes/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_REDIRECT_DOMAIN", "https://qr.test");
});

describe("PATCH /api/v1/qrcodes/[id]", () => {
  it("updates a code and returns it", async () => {
    // First query snapshots the pre-update row for auditing, then the update.
    setDb([
      { data: { id: "abc", short_slug: "s", is_active: true, destination_url: "https://old.test" } },
      { data: { id: "abc", short_slug: "s", is_active: true, destination_url: "https://new.test" } },
    ]);
    const res = await route.PATCH(jsonRequest("PATCH", { destination_url: "https://new.test" }), ctx({ id: "abc" }));
    expect(res.status).toBe(200);
    expect((await res.json()).destination_url).toBe("https://new.test");
  });

  it("returns 404 when the code is not found / not owned", async () => {
    setDb([{ data: null }, { error: { code: "PGRST116" } }]);
    const res = await route.PATCH(jsonRequest("PATCH", { name: "x" }), ctx({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("rejects an empty update with 400", async () => {
    setDb([]);
    const res = await route.PATCH(jsonRequest("PATCH", {}), ctx({ id: "abc" }));
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
      ctx({ id: "abc" }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a folder the caller does not own with 400", async () => {
    setDb([{ data: null }]); // folder ownership lookup finds nothing
    const res = await route.PATCH(
      jsonRequest("PATCH", { folder_id: "22222222-2222-4222-8222-222222222222" }),
      ctx({ id: "abc" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Folder not found");
  });
});

describe("DELETE /api/v1/qrcodes/[id]", () => {
  it("deletes a code", async () => {
    setDb([{ data: { short_slug: "s" } }]);
    const res = await route.DELETE(jsonRequest("DELETE"), ctx({ id: "abc" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("returns 404 when not found", async () => {
    setDb([{ error: { code: "PGRST116" } }]);
    const res = await route.DELETE(jsonRequest("DELETE"), ctx({ id: "missing" }));
    expect(res.status).toBe(404);
  });
});
