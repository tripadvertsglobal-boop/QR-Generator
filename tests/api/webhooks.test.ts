import { describe, it, expect, beforeEach, vi } from "vitest";
import { setDb } from "../helpers/route";
import { jsonRequest, ctx } from "../helpers/request";
import * as webhooks from "@/app/api/v1/webhooks/route";
import * as webhookId from "@/app/api/v1/webhooks/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/v1/webhooks", () => {
  it("registers a webhook to a public URL", async () => {
    setDb([{ data: { id: "w1", url: "https://hook.example.com", events: ["qr.created"], secret: "whsec_x", is_active: true } }]);
    const res = await webhooks.POST(jsonRequest("POST", { url: "https://hook.example.com", events: ["qr.created"] }), ctx());
    expect(res.status).toBe(201);
    expect((await res.json()).secret).toMatch(/^whsec_/);
  });

  it("rejects a private/SSRF URL in production with 400", async () => {
    vi.stubEnv("NODE_ENV", "production");
    setDb([]);
    const res = await webhooks.POST(jsonRequest("POST", { url: "http://127.0.0.1/x", events: ["qr.created"] }), ctx());
    expect(res.status).toBe(400);
  });

  it("rejects an invalid body with 400", async () => {
    setDb([]);
    const res = await webhooks.POST(jsonRequest("POST", { url: "not-a-url", events: [] }), ctx());
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/webhooks", () => {
  it("lists webhooks", async () => {
    setDb([{ data: [{ id: "w1" }] }]);
    const res = await webhooks.GET(jsonRequest("GET"), ctx());
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/v1/webhooks/[id]", () => {
  it("re-enables a webhook and resets failure_count", async () => {
    const mock = setDb([{ data: { id: "w1", is_active: true, failure_count: 0 } }]);
    const res = await webhookId.PATCH(jsonRequest("PATCH", { is_active: true }), ctx({ id: "w1" }));
    expect(res.status).toBe(200);
    expect(mock.calls).toContainEqual(
      expect.objectContaining({ method: "update", args: [{ is_active: true, failure_count: 0 }] }),
    );
  });

  it("pauses a webhook without touching failure_count", async () => {
    const mock = setDb([{ data: { id: "w1", is_active: false } }]);
    const res = await webhookId.PATCH(jsonRequest("PATCH", { is_active: false }), ctx({ id: "w1" }));
    expect(res.status).toBe(200);
    expect(mock.calls).toContainEqual(
      expect.objectContaining({ method: "update", args: [{ is_active: false }] }),
    );
  });

  it("returns 404 when not found", async () => {
    setDb([{ error: { code: "PGRST116" } }]);
    const res = await webhookId.PATCH(jsonRequest("PATCH", { is_active: true }), ctx({ id: "missing" }));
    expect(res.status).toBe(404);
  });

  it("rejects an invalid body with 400", async () => {
    setDb([]);
    const res = await webhookId.PATCH(jsonRequest("PATCH", {}), ctx({ id: "w1" }));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/v1/webhooks/[id]", () => {
  it("deletes a webhook", async () => {
    setDb([{ data: { id: "w1" } }]);
    const res = await webhookId.DELETE(jsonRequest("DELETE"), ctx({ id: "w1" }));
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    setDb([{ error: { code: "PGRST116" } }]);
    const res = await webhookId.DELETE(jsonRequest("DELETE"), ctx({ id: "missing" }));
    expect(res.status).toBe(404);
  });
});
