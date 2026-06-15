import { describe, it, expect, beforeEach, vi } from "vitest";
import { setDb } from "../helpers/route";
import { jsonRequest, ctx } from "../helpers/request";
import * as route from "@/app/api/v1/qrcodes/bulk/route";

const UUID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_REDIRECT_DOMAIN", "https://qr.test");
});

describe("POST /api/v1/qrcodes/bulk", () => {
  it("creates a batch and reports the count", async () => {
    setDb([{ data: [{ id: "1", short_slug: "a" }, { id: "2", short_slug: "b" }] }]);
    const res = await route.POST(
      jsonRequest("POST", { codes: [{ destination_url: "https://a.test" }, { destination_url: "https://b.test" }] }),
      ctx(),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).created).toBe(2);
  });

  it("rejects an empty batch with 400", async () => {
    setDb([]);
    const res = await route.POST(jsonRequest("POST", { codes: [] }), ctx());
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/v1/qrcodes/bulk", () => {
  it("deletes by id and reports the count", async () => {
    setDb([{ data: [{ short_slug: "a" }] }]);
    const res = await route.DELETE(jsonRequest("DELETE", { ids: [UUID] }), ctx());
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(1);
  });

  it("rejects a non-uuid id with 400", async () => {
    setDb([]);
    const res = await route.DELETE(jsonRequest("DELETE", { ids: ["not-a-uuid"] }), ctx());
    expect(res.status).toBe(400);
  });
});
