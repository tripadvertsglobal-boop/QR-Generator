import { describe, it, expect, beforeEach, vi } from "vitest";
import { setDb } from "../helpers/route";
import { jsonRequest, ctx } from "../helpers/request";
import * as keys from "@/app/api/v1/keys/route";
import * as keyId from "@/app/api/v1/keys/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/v1/keys", () => {
  it("mints a key and returns the raw secret once", async () => {
    setDb([
      { count: 0 }, // active-key count precheck
      { data: { id: "k1", name: "K", key_prefix: "qr_sk_ab12", scopes: ["qrcodes:read"], rate_limit: 100, expires_at: null, created_at: "x" } },
    ]);
    const res = await keys.POST(jsonRequest("POST", { name: "K" }), ctx());
    expect(res.status).toBe(201);
    expect((await res.json()).key).toMatch(/^qr_sk_/);
  });

  it("returns 409 at the 4-key cap", async () => {
    setDb([{ count: 4 }]);
    const res = await keys.POST(jsonRequest("POST", { name: "K" }), ctx());
    expect(res.status).toBe(409);
  });

  it("rejects a missing name with 400", async () => {
    setDb([]);
    const res = await keys.POST(jsonRequest("POST", {}), ctx());
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/keys", () => {
  it("lists keys without the secret", async () => {
    setDb([{ data: [{ id: "k1", key_prefix: "qr_sk_ab12" }] }]);
    const res = await keys.GET(jsonRequest("GET"), ctx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0]).not.toHaveProperty("key_hash");
  });
});

describe("DELETE /api/v1/keys/[id]", () => {
  it("revokes a key", async () => {
    setDb([{ data: { key_hash: "h" } }]);
    const res = await keyId.DELETE(jsonRequest("DELETE"), ctx({ id: "k1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("returns 404 when not found", async () => {
    setDb([{ error: { code: "PGRST116" } }]);
    const res = await keyId.DELETE(jsonRequest("DELETE"), ctx({ id: "missing" }));
    expect(res.status).toBe(404);
  });
});
