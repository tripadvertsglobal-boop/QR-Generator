import { vi } from "vitest";
import { authState } from "../helpers/auth-state";

// Some routes capture these at module-load time, so set them before any route
// module is imported. Per-test vi.stubEnv still overrides runtime reads.
process.env.NEXT_PUBLIC_REDIRECT_DOMAIN ||= "https://qr.test";
process.env.NEXT_PUBLIC_APP_URL ||= "https://app.test";

// Shared harness for route-handler tests. `withAuth` becomes a pass-through that
// injects the per-test auth context, and side-effecting libs are stubbed so each
// test asserts only the handler's own logic.

vi.mock("@/lib/auth", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withAuth: (handler: any) => (request: Request, context: any) =>
    handler(request, authState.current, context),
  purgeApiKeyCache: vi.fn(async () => {}),
  resolveAuth: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => authState.serviceDb,
}));

vi.mock("@/lib/kv", () => ({
  setConfig: vi.fn(async () => {}),
  delConfig: vi.fn(async () => {}),
  getConfig: vi.fn(async () => null),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
  auditDiff: vi.fn(() => null),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auditSnapshot: vi.fn((r: any) => r ?? null),
}));
vi.mock("@/lib/webhooks", () => ({ emitEvent: vi.fn() }));
vi.mock("@/lib/safe-browsing", () => ({ isUrlSafe: vi.fn(async () => true) }));
// buildConfig is stubbed (routes only pass its result to the KV mock), but
// isLive decides whether a route warms or evicts the cache — keep it real so
// archive/pause behaviour is actually exercised.
vi.mock("@/lib/slug-config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/slug-config")>()),
  buildConfig: vi.fn(() => ({})),
}));
vi.mock("@/lib/qr-write", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toDbFields: vi.fn(async (d: any) => d),
  // Mirrors the real implementation (no bcrypt involved), so route tests can
  // assert the password hash really is kept out of responses.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stripSecret: (row: any) => {
    const { password_hash: _omit, ...safe } = row;
    void _omit;
    return safe;
  },
}));
