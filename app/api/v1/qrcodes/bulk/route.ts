import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbError } from "@/lib/api-error";
import { setConfig, delConfig } from "@/lib/kv";
import { buildConfig } from "@/lib/slug-config";
import { generateSlug } from "@/lib/slug";
import { isUrlSafe } from "@/lib/safe-browsing";
import { logAudit } from "@/lib/audit";
import { bulkCreateSchema, bulkDeleteSchema } from "@/lib/validation";

const REDIRECT_DOMAIN = process.env.NEXT_PUBLIC_REDIRECT_DOMAIN;

// POST /api/v1/qrcodes/bulk — create up to 100 codes in one batch.
export const POST = withAuth(
  async (request, auth) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = bulkCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    // Same Safe Browsing gate as single create — bulk must not be the cheap
    // path to mint malicious links. Results are KV-cached, so dupes are cheap.
    const safety = await Promise.all(
      parsed.data.codes.map((c) => isUrlSafe(c.destination_url)),
    );
    const flagged = safety.findIndex((ok) => !ok);
    if (flagged !== -1) {
      return NextResponse.json(
        { error: `codes[${flagged}].destination_url was flagged as unsafe` },
        { status: 400 },
      );
    }

    // The FK only proves a folder exists — ownership must be checked here,
    // since under API-key auth the service client bypasses RLS.
    const folderIds = [
      ...new Set(parsed.data.codes.map((c) => c.folder_id).filter((v): v is string => !!v)),
    ];
    if (folderIds.length > 0) {
      const { data: owned, error: folderError } = await auth.db
        .from("folders")
        .select("id")
        .eq("user_id", auth.userId)
        .in("id", folderIds);
      if (folderError) return dbError(folderError);
      if ((owned ?? []).length !== folderIds.length) {
        return NextResponse.json({ error: "Folder not found" }, { status: 400 });
      }
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const rows = parsed.data.codes.map((c) => ({
        user_id: auth.userId,
        short_slug: generateSlug(),
        destination_url: c.destination_url,
        name: c.name ?? null,
        folder_id: c.folder_id ?? null,
        tags: c.tags ?? [],
      }));

      const { data, error } = await auth.db.from("qr_codes").insert(rows).select();
      if (error) {
        if (error.code === "23505") continue;
        return dbError(error);
      }

      await Promise.all(data.map((row) => setConfig(row.short_slug, buildConfig(row))));
      logAudit({
        userId: auth.userId,
        action: "qr.bulk_create",
        resourceType: "qr_code",
        newValue: { count: data.length, ids: data.map((row) => row.id) },
        request,
      });
      // Same curated contract as single create — never the raw row (which
      // would expose password_hash and internal columns).
      const codes = data.map((row) => ({
        id: row.id,
        name: row.name,
        destination_url: row.destination_url,
        short_slug: row.short_slug,
        tracking_url: `${REDIRECT_DOMAIN}/r/${row.short_slug}`,
        qr_svg_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/qrcodes/${row.id}/qr.svg`,
        folder_id: row.folder_id,
        tags: row.tags,
        is_active: row.is_active,
        created_at: row.created_at,
      }));
      return NextResponse.json({ created: codes.length, codes }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Could not allocate unique slugs, please retry" },
      { status: 503 },
    );
  },
  { scope: "qrcodes:write" },
);

// DELETE /api/v1/qrcodes/bulk — delete up to 100 codes by id and evict from KV.
export const DELETE = withAuth(
  async (request, auth) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = bulkDeleteSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { data, error } = await auth.db
      .from("qr_codes")
      .delete()
      .eq("user_id", auth.userId)
      .in("id", parsed.data.ids)
      .select("id, short_slug");

    if (error) return dbError(error);

    await Promise.all((data ?? []).map((row) => delConfig(row.short_slug)));
    logAudit({
      userId: auth.userId,
      action: "qr.bulk_delete",
      resourceType: "qr_code",
      oldValue: { count: data?.length ?? 0, deleted: data ?? [] },
      request,
    });
    return NextResponse.json({ deleted: data?.length ?? 0 });
  },
  { scope: "qrcodes:write" },
);

export { preflight as OPTIONS } from "@/lib/cors";
