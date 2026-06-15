import { describe, it, expect, beforeEach, vi } from "vitest";
import { setDb } from "../helpers/route";
import { jsonRequest, ctx } from "../helpers/request";
import * as route from "@/app/api/v1/qrcodes/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_REDIRECT_DOMAIN", "https://qr.test");
});

describe("PATCH /api/v1/qrcodes/[id]", () => {
  it("updates a code and returns it", async () => {
    setDb([{ data: { id: "abc", short_slug: "s", is_active: true, destination_url: "https://new.test" } }]);
    const res = await route.PATCH(jsonRequest("PATCH", { destination_url: "https://new.test" }), ctx({ id: "abc" }));
    expect(res.status).toBe(200);
    expect((await res.json()).destination_url).toBe("https://new.test");
  });

  it("returns 404 when the code is not found / not owned", async () => {
    setDb([{ error: { code: "PGRST116" } }]);
    const res = await route.PATCH(jsonRequest("PATCH", { name: "x" }), ctx({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("rejects an empty update with 400", async () => {
    setDb([]);
    const res = await route.PATCH(jsonRequest("PATCH", {}), ctx({ id: "abc" }));
    expect(res.status).toBe(400);
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
