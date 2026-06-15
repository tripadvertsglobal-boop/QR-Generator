import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { setConfig } from "@/lib/kv";
import { buildConfig } from "@/lib/slug-config";
import { toDbFields } from "@/lib/qr-write";
import { generateSlug } from "@/lib/slug";
import { isUrlSafe } from "@/lib/safe-browsing";
import { logAudit } from "@/lib/audit";
import { emitEvent } from "@/lib/webhooks";
import { createQrSchema } from "@/lib/validation";

// POST /api/v1/qrcodes — create a dynamic QR: generate slug, insert (scoped to
// the caller), warm the KV cache so the redirect engine resolves it instantly.
export const POST = withAuth(
  async (request, auth) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createQrSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    if (!(await isUrlSafe(parsed.data.destination_url))) {
      return NextResponse.json(
        { error: "Destination URL was flagged as unsafe" },
        { status: 400 },
      );
    }

    const fields = await toDbFields(parsed.data);

    for (let attempt = 0; attempt < 5; attempt++) {
      const short_slug = generateSlug();
      const { data, error } = await auth.db
        .from("qr_codes")
        .insert({ user_id: auth.userId, short_slug, ...fields })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") continue; // slug collision — retry
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      await setConfig(short_slug, buildConfig(data));
      logAudit({
        userId: auth.userId,
        action: "qr.create",
        resourceType: "qr_code",
        resourceId: data.id,
        newValue: { destination_url: parsed.data.destination_url, name: parsed.data.name },
        request,
      });
      emitEvent(auth.userId, "qr.created", { id: data.id, short_slug, destination_url: data.destination_url });

      // Curated, stable resource for integrations (e.g. mapping a QR to an ad
      // campaign): `id` is the QR's UUID — store it against your campaign;
      // `tracking_url` is what the QR encodes; `qr_svg_url` fetches the image.
      const tracking_url = `${process.env.NEXT_PUBLIC_REDIRECT_DOMAIN}/r/${short_slug}`;
      const qr_svg_url = `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/qrcodes/${data.id}/qr.svg`;
      return NextResponse.json(
        {
          id: data.id,
          name: data.name,
          destination_url: data.destination_url,
          short_slug: data.short_slug,
          tracking_url,
          qr_svg_url,
          folder_id: data.folder_id,
          tags: data.tags,
          is_active: data.is_active,
          created_at: data.created_at,
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      { error: "Could not allocate a unique slug, please retry" },
      { status: 503 },
    );
  },
  { scope: "qrcodes:write" },
);

// GET /api/v1/qrcodes — list the caller's codes. Filters: ?folder=<uuid|none>, ?tag=<tag>.
export const GET = withAuth(
  async (request, auth) => {
    const sp = new URL(request.url).searchParams;
    const folder = sp.get("folder");
    const tag = sp.get("tag");

    // Explicit column list keeps the password hash out of API responses.
    let query = auth.db
      .from("qr_codes")
      .select(
        "id, user_id, short_slug, destination_url, name, is_active, scan_count, folder_id, tags, active_from, active_until, ab_destinations, created_at, updated_at",
      )
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });
    if (folder === "none") query = query.is("folder_id", null);
    else if (folder) query = query.eq("folder_id", folder);
    if (tag) query = query.contains("tags", [tag]);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  },
  { scope: "qrcodes:read" },
);

export { preflight as OPTIONS } from "@/lib/cors";
