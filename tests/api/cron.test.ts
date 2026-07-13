import { describe, it, expect, beforeEach, vi } from "vitest";
import { setServiceDb } from "../helpers/route";
import { GET } from "@/app/api/cron/audit-retention/route";

const url = "http://test.local/api/cron/audit-retention";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("GET /api/cron/audit-retention", () => {
  it("purges with the correct bearer and reports the count", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    setServiceDb([{ count: 3 }]);
    const res = await GET(new Request(url, { headers: { authorization: "Bearer s3cret" } }));
    expect(res.status).toBe(200);
    expect((await res.json()).purged).toBe(3);
  });

  it("rejects a wrong bearer with 401", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    setServiceDb([]);
    const res = await GET(new Request(url, { headers: { authorization: "Bearer nope" } }));
    expect(res.status).toBe(401);
  });

  it("fails closed in production when CRON_SECRET is unset", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "");
    setServiceDb([]);
    const res = await GET(new Request(url));
    expect(res.status).toBe(503);
  });
});
