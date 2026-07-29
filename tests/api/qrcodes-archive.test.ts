import { describe, it, expect, beforeEach, vi } from "vitest";
import { setDb } from "../helpers/route";
import { jsonRequest, ctx } from "../helpers/request";
import { setConfig, delConfig } from "@/lib/kv";
import * as idRoute from "@/app/api/v1/qrcodes/[id]/route";
import * as bulkRoute from "@/app/api/v1/qrcodes/bulk/route";
import * as listRoute from "@/app/api/v1/qrcodes/route";
import { RES_ID, OTHER_ID } from "../helpers/ids";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_REDIRECT_DOMAIN", "https://qr.test");
});

const archivedRow = {
  id: "abc",
  short_slug: "s",
  is_active: true,
  archived_at: "2026-07-01T00:00:00.000Z",
};
const liveRow = { id: "abc", short_slug: "s", is_active: true, archived_at: null };

describe("PATCH /api/v1/qrcodes/[id] — archive", () => {
  // The whole point of archiving is that the code stops resolving. A stale KV
  // entry would keep it redirecting for up to the cache TTL.
  it("evicts the KV cache when a code is archived", async () => {
    setDb([{ data: liveRow }, { data: archivedRow }]);
    const res = await idRoute.PATCH(jsonRequest("PATCH", { archived: true }), ctx({ id: RES_ID }));
    expect(res.status).toBe(200);
    expect(delConfig).toHaveBeenCalledWith("s");
    expect(setConfig).not.toHaveBeenCalled();
  });

  it("re-warms the cache when a code is restored", async () => {
    setDb([{ data: archivedRow }, { data: liveRow }]);
    const res = await idRoute.PATCH(jsonRequest("PATCH", { archived: false }), ctx({ id: RES_ID }));
    expect(res.status).toBe(200);
    expect(setConfig).toHaveBeenCalledWith("s", expect.anything());
    expect(delConfig).not.toHaveBeenCalled();
  });

  // A code paused before archiving must not silently go live again on restore.
  it("leaves a restored-but-paused code evicted", async () => {
    setDb([{ data: archivedRow }, { data: { ...liveRow, is_active: false } }]);
    await idRoute.PATCH(jsonRequest("PATCH", { archived: false }), ctx({ id: RES_ID }));
    expect(delConfig).toHaveBeenCalledWith("s");
    expect(setConfig).not.toHaveBeenCalled();
  });

  it("rejects a non-boolean archived value", async () => {
    setDb([]);
    const res = await idRoute.PATCH(
      jsonRequest("PATCH", { archived: "yes" }),
      ctx({ id: RES_ID }),
    );
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/v1/qrcodes/bulk — archive", () => {
  it("archives the given ids and reports the count", async () => {
    setDb([{ data: [archivedRow, { ...archivedRow, id: "def", short_slug: "t" }] }]);
    const res = await bulkRoute.PATCH(
      jsonRequest("PATCH", { ids: [RES_ID, OTHER_ID], archived: true }),
      ctx(),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ archived: 2 });
    expect(delConfig).toHaveBeenCalledWith("s");
    expect(delConfig).toHaveBeenCalledWith("t");
  });

  it("restores and reports under a `restored` key", async () => {
    setDb([{ data: [liveRow] }]);
    const res = await bulkRoute.PATCH(
      jsonRequest("PATCH", { ids: [RES_ID], archived: false }),
      ctx(),
    );
    expect(await res.json()).toEqual({ restored: 1 });
    expect(setConfig).toHaveBeenCalledWith("s", expect.anything());
  });

  it("requires the archived flag", async () => {
    setDb([]);
    const res = await bulkRoute.PATCH(jsonRequest("PATCH", { ids: [RES_ID] }), ctx());
    expect(res.status).toBe(400);
  });

  it("rejects more than 100 ids", async () => {
    setDb([]);
    const ids = Array.from({ length: 101 }, () => RES_ID);
    const res = await bulkRoute.PATCH(jsonRequest("PATCH", { ids, archived: true }), ctx());
    expect(res.status).toBe(400);
  });
});

describe("archived codes and the plan quota", () => {
  // Archiving has to free a slot, or it would be strictly worse than deleting.
  it("counts only live codes against the cap", async () => {
    const mock = setDb([{ count: 9 }, { data: { id: "new", short_slug: "n" } }], "user-1", "free");
    const res = await listRoute.POST(
      jsonRequest("POST", { destination_url: "https://example.com" }),
      ctx(),
    );
    expect(res.status).toBe(201);
    const countFilter = mock.calls.find((c) => c.method === "is" && c.args[0] === "archived_at");
    expect(countFilter).toBeDefined();
    expect(countFilter?.args[1]).toBeNull();
  });
});

describe("GET /api/v1/qrcodes — archived filter", () => {
  it("excludes archived codes by default", async () => {
    const mock = setDb([{ data: [] }]);
    await listRoute.GET(jsonRequest("GET", undefined, "https://app.test/api/v1/qrcodes"), ctx());
    const filter = mock.calls.find((c) => c.method === "is" && c.args[0] === "archived_at");
    expect(filter?.args[1]).toBeNull();
  });

  it("returns only archived codes with ?archived=true", async () => {
    const mock = setDb([{ data: [] }]);
    await listRoute.GET(
      jsonRequest("GET", undefined, "https://app.test/api/v1/qrcodes?archived=true"),
      ctx(),
    );
    expect(mock.calls.some((c) => c.method === "not" && c.args[0] === "archived_at")).toBe(true);
  });

  it("returns both with ?archived=all", async () => {
    const mock = setDb([{ data: [] }]);
    await listRoute.GET(
      jsonRequest("GET", undefined, "https://app.test/api/v1/qrcodes?archived=all"),
      ctx(),
    );
    expect(mock.calls.some((c) => c.args[0] === "archived_at")).toBe(false);
  });
});
