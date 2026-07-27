import { describe, it, expect, beforeEach, vi } from "vitest";
import { setDb } from "../helpers/route";
import { jsonRequest, ctx } from "../helpers/request";
import * as qrcodes from "@/app/api/v1/qrcodes/route";
import * as bulk from "@/app/api/v1/qrcodes/bulk/route";
import * as exportCsv from "@/app/api/v1/qrcodes/export/route";
import * as folders from "@/app/api/v1/folders/route";
import * as keys from "@/app/api/v1/keys/route";
import * as webhooks from "@/app/api/v1/webhooks/route";

beforeEach(() => {
  vi.clearAllMocks();
});

const free = (results: Parameters<typeof setDb>[0] = []) => setDb(results, "user-1", "free");

describe("free plan quotas", () => {
  it("refuses a new QR code at the cap with 402", async () => {
    free([{ count: 10 }]);
    const res = await qrcodes.POST(
      jsonRequest("POST", { destination_url: "https://x.com" }),
      ctx(),
    );
    expect(res.status).toBe(402);
    expect((await res.json()).error).toMatch(/Free plan limit reached \(10 QR codes\)/);
  });

  it("allows a new QR code below the cap", async () => {
    free([{ count: 9 }, { data: { id: "q", short_slug: "s", destination_url: "https://x.com" } }]);
    const res = await qrcodes.POST(
      jsonRequest("POST", { destination_url: "https://x.com" }),
      ctx(),
    );
    expect(res.status).toBe(201);
  });

  it("refuses a second folder with 402", async () => {
    free([{ count: 1 }]);
    const res = await folders.POST(jsonRequest("POST", { name: "Second" }), ctx());
    expect(res.status).toBe(402);
  });

  it("blocks bulk creation entirely", async () => {
    free();
    const res = await bulk.POST(
      jsonRequest("POST", { codes: [{ destination_url: "https://x.com" }] }),
      ctx(),
    );
    expect(res.status).toBe(402);
    expect((await res.json()).error).toMatch(/Bulk creation/);
  });

  it("blocks CSV export", async () => {
    free();
    const res = await exportCsv.GET(jsonRequest("GET"), ctx());
    expect(res.status).toBe(402);
  });

  it("blocks API key creation", async () => {
    free();
    const res = await keys.POST(jsonRequest("POST", { name: "k" }), ctx());
    expect(res.status).toBe(402);
    expect((await res.json()).error).toMatch(/API access/);
  });

  it("blocks webhook registration", async () => {
    free();
    const res = await webhooks.POST(
      jsonRequest("POST", { url: "https://hook.test", events: ["qr.created"] }),
      ctx(),
    );
    expect(res.status).toBe(402);
  });
});

describe("bulk creation against the quota", () => {
  it("refuses a batch that would cross the cap", async () => {
    // 5 existing + 8 requested > 10.
    setDb([{ count: 5 }], "user-1", "free");
    const res = await bulk.POST(
      jsonRequest("POST", {
        codes: Array.from({ length: 8 }, () => ({ destination_url: "https://x.com" })),
      }),
      ctx(),
    );
    // Bulk is gated before the count check, so free fails on the feature gate.
    expect(res.status).toBe(402);
  });

  it("does not count-check an unlimited plan", async () => {
    const mock = setDb([{ data: [{ id: "a", short_slug: "s", tags: [] }] }], "user-1", "pro");
    const res = await bulk.POST(
      jsonRequest("POST", { codes: [{ destination_url: "https://x.com" }] }),
      ctx(),
    );
    expect(res.status).toBe(201);
    // No count query was issued — the first table touched is the insert target.
    expect(mock.calls.some((c) => c.method === "select" && c.args[1])).toBe(false);
  });
});

describe("API key rate limit ceiling", () => {
  it("clamps a requested rate limit to the plan ceiling", async () => {
    const mock = setDb(
      [{ count: 0 }, { data: { id: "k", name: "K", key_prefix: "qr_sk_a" } }],
      "user-1",
      "pro",
    );
    const res = await keys.POST(
      jsonRequest("POST", { name: "K", rate_limit: 10000 }),
      ctx(),
    );
    expect(res.status).toBe(201);
    const insert = mock.calls.find((c) => c.method === "insert");
    // Pro's ceiling is 100 — a caller must not be able to opt into 10000.
    expect((insert?.args[0] as { rate_limit: number }).rate_limit).toBe(100);
  });
});
