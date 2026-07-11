import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

type Row = Record<string, unknown>;

// Never write these to the audit trail, whatever table they come from.
const SENSITIVE = new Set([
  "password",
  "password_hash",
  "key_hash",
  "secret",
  "raw",
  "key",
  "token",
]);

// Full-row snapshot for create/delete audits (no before/after counterpart to
// diff against). Sensitive fields are dropped entirely.
export function auditSnapshot(row: Row | null | undefined): Row | null {
  if (!row) return null;
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (!SENSITIVE.has(k)) out[k] = v;
  }
  return out;
}

// Changed-fields-only diff for updates: over the given keys, keep just those
// whose value actually changed, as parallel { old } / { new } maps. Sensitive
// keys are never compared or emitted. Returns null when nothing changed.
export function auditDiff(
  before: Row | null | undefined,
  after: Row | null | undefined,
  keys: string[],
): { oldValue: Row; newValue: Row } | null {
  const oldValue: Row = {};
  const newValue: Row = {};
  let changed = false;
  for (const k of keys) {
    if (SENSITIVE.has(k)) continue;
    const b = before?.[k] ?? null;
    const a = after?.[k] ?? null;
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      oldValue[k] = b;
      newValue[k] = a;
      changed = true;
    }
  }
  return changed ? { oldValue, newValue } : null;
}

type AuditEntry = {
  userId: string;
  action: string; // 'qr.create', 'qr.update', 'qr.delete', 'key.create', ...
  resourceType: string; // 'qr_code', 'api_key', 'folder'
  resourceId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  request?: Request;
};

// Fire-and-forget audit write (after the response is sent). Failures are
// swallowed — auditing must never break the mutation it records.
export function logAudit(entry: AuditEntry): void {
  const ip =
    entry.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = entry.request?.headers.get("user-agent") ?? null;

  after(async () => {
    try {
      await createServiceClient()
        .from("audit_logs")
        .insert({
          user_id: entry.userId,
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId ?? null,
          old_value: entry.oldValue ?? null,
          new_value: entry.newValue ?? null,
          ip_address: ip,
          user_agent: userAgent,
        });
    } catch {
      // intentionally ignored
    }
  });
}
