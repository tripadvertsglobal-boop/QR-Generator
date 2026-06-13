import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/server";
import { setDestination } from "@/lib/kv";
import { generateSlug } from "@/lib/slug";
import { createQrSchema } from "@/lib/validation";

// POST /api/v1/qrcodes — create a dynamic QR: generate slug, insert (RLS-scoped),
// warm the KV cache so the redirect engine resolves it instantly.
export async function POST(request: Request) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Insert with a fresh slug, retrying on the rare unique-slug collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const short_slug = generateSlug();
    const { data, error } = await supabase
      .from("qr_codes")
      .insert({ user_id: user.id, short_slug, destination_url, name, folder_id, tags })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") continue; // slug collision — retry
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await setDestination(short_slug, data.destination_url);
    const tracking_url = `${process.env.NEXT_PUBLIC_REDIRECT_DOMAIN}/r/${short_slug}`;
    return NextResponse.json({ ...data, tracking_url }, { status: 201 });
  }

  return NextResponse.json(
    { error: "Could not allocate a unique slug, please retry" },
    { status: 503 },
  );
}

// GET /api/v1/qrcodes — list the caller's codes (RLS returns only their rows).
// Optional filters: ?folder=<uuid|none> and ?tag=<tag>.
export async function GET(request: Request) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const folder = sp.get("folder");
  const tag = sp.get("tag");

  let query = supabase.from("qr_codes").select("*").order("created_at", { ascending: false });
  if (folder === "none") query = query.is("folder_id", null);
  else if (folder) query = query.eq("folder_id", folder);
  if (tag) query = query.contains("tags", [tag]);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
