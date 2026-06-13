import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

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
