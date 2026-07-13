import { describe, it, expect, beforeEach, vi } from "vitest";
import { setDb } from "../helpers/route";
import { jsonRequest, ctx } from "../helpers/request";
import { isUrlSafe } from "@/lib/safe-browsing";
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

  it("rejects a batch containing an unsafe URL and names the index", async () => {
    setDb([]);
    vi.mocked(isUrlSafe).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const res = await route.POST(
      jsonRequest("POST", {
        codes: [{ destination_url: "https://ok.test" }, { destination_url: "https://malware.test" }],
      }),
      ctx(),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("codes[1]");
  });

  it("rejects a folder the caller does not own with 400", async () => {
    setDb([{ data: [] }]); // folders ownership query matches none
    const res = await route.POST(
      jsonRequest("POST", {
        codes: [{ destination_url: "https://a.test", folder_id: "22222222-2222-4222-8222-222222222222" }],
      }),
      ctx(),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Folder not found");
  });

  it("returns the curated contract, never the raw row", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.test");
    setDb([
      {
        data: [
          {
            id: "1",
            short_slug: "a",
            destination_url: "https://a.test",
            name: null,
            folder_id: null,
            tags: [],
            is_active: true,
            created_at: "2026-01-01",
            user_id: "user-1",
            password_hash: null,
          },
        ],
      },
    ]);
    const res = await route.POST(
      jsonRequest("POST", { codes: [{ destination_url: "https://a.test" }] }),
      ctx(),
    );
    expect(res.status).toBe(201);
    const code = (await res.json()).codes[0];
    expect(code.tracking_url).toBe("https://qr.test/r/a");
    expect(code.qr_svg_url).toBe("https://app.test/api/v1/qrcodes/1/qr.svg");
    expect(code).not.toHaveProperty("password_hash");
    expect(code).not.toHaveProperty("user_id");
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
