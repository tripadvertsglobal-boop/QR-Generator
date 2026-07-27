import { authState } from "./auth-state";
import { createDbMock, type DbResult } from "./supabase-mock";

const ALL_SCOPES = [
  "qrcodes:read",
  "qrcodes:write",
  "folders:read",
  "folders:write",
  "keys:read",
  "keys:write",
  "account:read",
  "account:write",
];

// Install a per-test auth context backed by a queued Supabase mock. Defaults to
// the `pro` plan so plan gating is out of the way unless a test opts into it.
export function setDb(results: DbResult[] = [], userId = "user-1", plan = "pro") {
  const mock = createDbMock(results, plan);
  authState.current = { userId, authType: "jwt", scopes: ALL_SCOPES, db: mock.db };
  return mock;
}

// Install the RLS-bypassing service client (used by routes like account delete).
export function setServiceDb(results: DbResult[] = []) {
  const mock = createDbMock(results);
  authState.serviceDb = mock.db;
  return mock;
}
