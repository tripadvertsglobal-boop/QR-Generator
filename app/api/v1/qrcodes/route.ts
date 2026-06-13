import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { setDestination } from "@/lib/kv";
import { generateSlug } from "@/lib/slug";
import { isUrlSafe } from "@/lib/safe-browsing";
import { logAudit } from "@/lib/audit";
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
    const { destination_url, name = null, folder_id = null, tags = [] } = parsed.data;

    if (!(await isUrlSafe(destination_url))) {
      return NextResponse.json(
        { error: "Destination URL was flagged as unsafe" },
        { status: 400 },
      );
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const short_slug = generateSlug();
      const { data, error } = await auth.db
        .from("qr_codes")
        .insert({ user_id: auth.userId, short_slug, destination_url, name, folder_id, tags })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") continue; // slug collision — retry
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      await setDestination(short_slug, data.destination_url);
      logAudit({
        userId: auth.userId,
        action: "qr.create",
        resourceType: "qr_code",
        resourceId: data.id,
        newValue: { destination_url, name },
        request,
      });
      const tracking_url = `${process.env.NEXT_PUBLIC_REDIRECT_DOMAIN}/r/${short_slug}`;
      return NextResponse.json({ ...data, tracking_url }, { status: 201 });
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

    let query = auth.db
      .from("qr_codes")
      .select("*")
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
