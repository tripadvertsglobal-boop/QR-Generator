import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

// GET /api/v1/account/export — GDPR data portability. Returns a JSON archive of
// all of the caller's data (RLS-scoped; API keys/webhook secrets excluded where
// sensitive). JWT only.
export const GET = withAuth(
  async (_request, auth) => {
    const db = auth.db;
    const [profile, qrCodes, folders, scanLogs, apiKeys, webhooks, auditLogs] = await Promise.all([
      db.from("user_profiles").select("*").eq("id", auth.userId).maybeSingle(),
      db.from("qr_codes").select("*").eq("user_id", auth.userId),
      db.from("folders").select("*").eq("user_id", auth.userId),
      db.from("scan_logs").select("*").limit(10000), // RLS scopes to owned codes
      db.from("api_keys").select("id, name, key_prefix, scopes, last_used_at, expires_at, created_at").eq("user_id", auth.userId),
      db.from("webhooks").select("id, url, events, is_active, created_at").eq("user_id", auth.userId),
      db.from("audit_logs").select("*").eq("user_id", auth.userId).order("created_at", { ascending: false }).limit(10000),
    ]);

    const archive = {
      exported_at: new Date().toISOString(),
      user_id: auth.userId,
      profile: profile.data,
      qr_codes: qrCodes.data ?? [],
      folders: folders.data ?? [],
      scan_logs: scanLogs.data ?? [],
      api_keys: apiKeys.data ?? [],
      webhooks: webhooks.data ?? [],
      audit_logs: auditLogs.data ?? [],
    };

    // Strip password hashes from the exported qr_codes.
    archive.qr_codes = archive.qr_codes.map((c: Record<string, unknown>) => {
      const { password_hash: _omit, ...rest } = c;
      void _omit;
      return rest;
    });

    return new NextResponse(JSON.stringify(archive, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="qrgenerator-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  },
  { jwtOnly: true },
);

export { preflight as OPTIONS } from "@/lib/cors";
