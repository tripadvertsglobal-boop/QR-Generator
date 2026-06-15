import { describe, it, expect, beforeEach, vi } from "vitest";
import { setDb, setServiceDb } from "../helpers/route";
import { jsonRequest, ctx } from "../helpers/request";
import * as account from "@/app/api/v1/account/route";
import * as auditLog from "@/app/api/v1/account/audit-log/route";
import * as exportRoute from "@/app/api/v1/account/export/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/account", () => {
  it("returns the caller's profile", async () => {
    setDb([{ data: { id: "user-1", display_name: "Me" } }]);
    const res = await account.GET(jsonRequest("GET"), ctx());
    expect(res.status).toBe(200);
    expect((await res.json()).display_name).toBe("Me");
  });
});

describe("PATCH /api/v1/account", () => {
  it("updates the profile", async () => {
    setDb([{ data: { id: "user-1", display_name: "New", timezone: "UTC" } }]);
    const res = await account.PATCH(jsonRequest("PATCH", { display_name: "New" }), ctx());
    expect(res.status).toBe(200);
  });

  it("rejects an empty update with 400", async () => {
    setDb([]);
    const res = await account.PATCH(jsonRequest("PATCH", {}), ctx());
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/v1/account (GDPR erasure)", () => {
  it("purges KV slugs and deletes the auth user", async () => {
    setDb([]); // provides auth.userId; route uses the service client below
    const svc = setServiceDb([{ data: [{ short_slug: "a" }] }, { error: null }]);
    const res = await account.DELETE(jsonRequest("DELETE"), ctx());
    expect(res.status).toBe(200);
    expect(svc.db.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
  });
});

describe("GET /api/v1/account/audit-log", () => {
  it("lists recent mutations", async () => {
    setDb([{ data: [{ id: "a1", action: "qr.create" }] }]);
    const res = await auditLog.GET(jsonRequest("GET"), ctx());
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/account/export (GDPR portability)", () => {
  it("returns a JSON archive with password hashes stripped", async () => {
    setDb([
      { data: { id: "user-1" } }, // profile (maybeSingle)
      { data: [{ id: "q1", password_hash: "secret", destination_url: "https://a.test" }] }, // qr_codes
      { data: [] }, // folders
      { data: [] }, // scan_logs
      { data: [] }, // api_keys
      { data: [] }, // webhooks
      { data: [] }, // audit_logs
    ]);
    const res = await exportRoute.GET(jsonRequest("GET"), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    const archive = JSON.parse(await res.text());
    expect(archive.qr_codes[0]).not.toHaveProperty("password_hash");
    expect(archive.qr_codes[0].destination_url).toBe("https://a.test");
  });
});
