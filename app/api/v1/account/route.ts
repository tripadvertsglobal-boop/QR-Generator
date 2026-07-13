import { NextResponse } from "next/server";
import { withAuth, purgeApiKeyCache } from "@/lib/auth";
import { dbError } from "@/lib/api-error";
import { createServiceClient } from "@/lib/supabase/service";
import { delConfig } from "@/lib/kv";
import { logAudit, auditDiff } from "@/lib/audit";
import { updateAccountSchema } from "@/lib/validation";

// GET /api/v1/account — the caller's profile.
export const GET = withAuth(
  async (_request, auth) => {
    const { data } = await auth.db
      .from("user_profiles")
      .select("id, display_name, avatar_url, timezone, email_verified, created_at")
      .eq("id", auth.userId)
      .maybeSingle();
    return NextResponse.json(data ?? { id: auth.userId });
  },
  { jwtOnly: true },
);

// PATCH /api/v1/account — update profile fields.
export const PATCH = withAuth(
  async (request, auth) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = updateAccountSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { data: before } = await auth.db
      .from("user_profiles")
      .select("id, display_name, timezone")
      .eq("id", auth.userId)
      .maybeSingle();

    const { data, error } = await auth.db
      .from("user_profiles")
      .update(parsed.data)
      .eq("id", auth.userId)
      .select("id, display_name, timezone")
      .single();
    if (error) return dbError(error);
    const diff = auditDiff(before, data, Object.keys(parsed.data));
    logAudit({
      userId: auth.userId,
      action: "account.update",
      resourceType: "user_profile",
      resourceId: auth.userId,
      oldValue: diff?.oldValue ?? null,
      newValue: diff?.newValue ?? null,
      request,
    });
    return NextResponse.json(data);
  },
  { jwtOnly: true },
);

// DELETE /api/v1/account — GDPR erasure. Purge KV slug keys, then delete the
// auth user (cascades to all owned rows via ON DELETE CASCADE).
export const DELETE = withAuth(
  async (_request, auth) => {
    const svc = createServiceClient();

    const { data: codes } = await svc
      .from("qr_codes")
      .select("short_slug")
      .eq("user_id", auth.userId);
    await Promise.all((codes ?? []).map((c) => delConfig(c.short_slug)));

    // Purge cached API keys too, or they keep authenticating for up to 60s
    // after the rows are cascade-deleted.
    const { data: keys } = await svc
      .from("api_keys")
      .select("key_hash")
      .eq("user_id", auth.userId);
    await Promise.all((keys ?? []).map((k) => purgeApiKeyCache(k.key_hash)));

    const { error } = await svc.auth.admin.deleteUser(auth.userId);
    if (error) return dbError(error);

    return NextResponse.json({ success: true });
  },
  { jwtOnly: true },
);

export { preflight as OPTIONS } from "@/lib/cors";
