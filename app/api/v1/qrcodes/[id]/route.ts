import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { setConfig, delConfig } from "@/lib/kv";
import { buildConfig } from "@/lib/slug-config";
import { toDbFields, stripSecret } from "@/lib/qr-write";
import { isUrlSafe } from "@/lib/safe-browsing";
import { logAudit } from "@/lib/audit";
import { updateQrSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/v1/qrcodes/[id] — update destination / is_active / name / folder /
// tags and keep the KV cache in sync (warm active, evict paused).
export const PATCH = withAuth(
  async (request, auth, { params }: Ctx) => {
    const { id } = await params;

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = updateQrSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    if (parsed.data.destination_url && !(await isUrlSafe(parsed.data.destination_url))) {
      return NextResponse.json({ error: "Destination URL was flagged as unsafe" }, { status: 400 });
    }

    const fields = await toDbFields(parsed.data);

    // Explicit user scoping so service-role (API-key) requests stay tenant-isolated.
    const { data, error } = await auth.db
      .from("qr_codes")
      .update(fields)
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Keep KV in sync with the full config (paused codes are evicted).
    if (data.is_active) await setConfig(data.short_slug, buildConfig(data));
    else await delConfig(data.short_slug);

    const { password: _pw, ...auditFields } = parsed.data;
    void _pw;
    logAudit({
      userId: auth.userId,
      action: "qr.update",
      resourceType: "qr_code",
      resourceId: id,
      newValue: auditFields,
      request,
    });
    return NextResponse.json(stripSecret(data));
  },
  { scope: "qrcodes:write" },
);

// DELETE /api/v1/qrcodes/[id] — delete the row and evict from KV.
export const DELETE = withAuth(
  async (request, auth, { params }: Ctx) => {
    const { id } = await params;

    const { data, error } = await auth.db
      .from("qr_codes")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select("short_slug")
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await delConfig(data.short_slug);
    logAudit({ userId: auth.userId, action: "qr.delete", resourceType: "qr_code", resourceId: id, request });
    return NextResponse.json({ success: true });
  },
  { scope: "qrcodes:write" },
);

export { preflight as OPTIONS } from "@/lib/cors";
