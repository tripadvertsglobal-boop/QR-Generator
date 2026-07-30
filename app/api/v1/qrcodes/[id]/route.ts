import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbError } from "@/lib/api-error";
import { setConfig, delConfig } from "@/lib/kv";
import { buildConfig, isLive } from "@/lib/slug-config";
import { toDbFields, stripSecret } from "@/lib/qr-write";
import { isUrlSafe } from "@/lib/safe-browsing";
import { logAudit, auditDiff, auditSnapshot } from "@/lib/audit";
import { emitEvent } from "@/lib/webhooks";
import { getPlanLimits, upgradeRequired } from "@/lib/plan";
import { updateQrSchema, isUuid } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/v1/qrcodes/[id] — fetch one code. Same shape as a PATCH response and
// as an item in the listing. Archived codes are returned too: unlike the
// listing, a request by id already says which code it wants.
export const GET = withAuth(
  async (_request, auth, { params }: Ctx) => {
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Explicit user scoping so service-role (API-key) requests stay tenant-isolated.
    const { data, error } = await auth.db
      .from("qr_codes")
      .select()
      .eq("id", id)
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (error) return dbError(error);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(stripSecret(data));
  },
  { scope: "qrcodes:read" },
);

// PATCH /api/v1/qrcodes/[id] — update destination / is_active / name / folder /
// tags and keep the KV cache in sync (warm active, evict paused).
export const PATCH = withAuth(
  async (request, auth, { params }: Ctx) => {
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

    // Archiving is a paid feature. Checked only when the patch actually touches
    // it, so an ordinary update still costs no extra query. Deleting stays
    // ungated on every plan.
    if (parsed.data.archived !== undefined) {
      const limits = await getPlanLimits(auth.db, auth.userId);
      if (!limits.archiving) {
        return NextResponse.json({ error: upgradeRequired("Archiving") }, { status: 402 });
      }
    }

    // Screen every URL a scanner can be sent to — A/B arms included, since
    // pickDestination routes real traffic to them.
    const urls = [
      ...(parsed.data.destination_url ? [parsed.data.destination_url] : []),
      ...(parsed.data.ab_destinations ?? []).map((d) => d.url),
    ];
    const safety = await Promise.all(urls.map(isUrlSafe));
    if (safety.some((ok) => !ok)) {
      return NextResponse.json({ error: "Destination URL was flagged as unsafe" }, { status: 400 });
    }

    // The FK only proves the folder exists — ownership must be checked here,
    // since under API-key auth the service client bypasses RLS.
    if (parsed.data.folder_id) {
      const { data: folder } = await auth.db
        .from("folders")
        .select("id")
        .eq("id", parsed.data.folder_id)
        .eq("user_id", auth.userId)
        .maybeSingle();
      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 400 });
      }
    }

    const fields = await toDbFields(parsed.data);

    // Snapshot the pre-update row so the audit trail can record what changed.
    const { data: before } = await auth.db
      .from("qr_codes")
      .select()
      .eq("id", id)
      .eq("user_id", auth.userId)
      .maybeSingle();

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
      return dbError(error);
    }

    // Keep KV in sync with the full config (paused *and* archived are evicted,
    // so a live cache entry can never outlive the code being retired).
    if (isLive(data)) await setConfig(data.short_slug, buildConfig(data));
    else await delConfig(data.short_slug);

    const diff = auditDiff(before, data, Object.keys(parsed.data));
    const newValue = { ...(diff?.newValue ?? {}) };
    // A password change never diffs (the hash is sensitive) — note it explicitly.
    if (parsed.data.password !== undefined) newValue.password = "[changed]";
    logAudit({
      userId: auth.userId,
      action: "qr.update",
      resourceType: "qr_code",
      resourceId: id,
      oldValue: diff?.oldValue ?? null,
      newValue: Object.keys(newValue).length ? newValue : null,
      request,
    });
    emitEvent(auth.userId, "qr.updated", { id, short_slug: data.short_slug });
    return NextResponse.json(stripSecret(data));
  },
  { scope: "qrcodes:write" },
);

// DELETE /api/v1/qrcodes/[id] — delete the row and evict from KV.
export const DELETE = withAuth(
  async (request, auth, { params }: Ctx) => {
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data, error } = await auth.db
      .from("qr_codes")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 });
      return dbError(error);
    }

    await delConfig(data.short_slug);
    logAudit({
      userId: auth.userId,
      action: "qr.delete",
      resourceType: "qr_code",
      resourceId: id,
      oldValue: auditSnapshot(data),
      request,
    });
    emitEvent(auth.userId, "qr.deleted", { id, short_slug: data.short_slug });
    return NextResponse.json({ success: true });
  },
  { scope: "qrcodes:write" },
);

export { preflight as OPTIONS } from "@/lib/cors";
