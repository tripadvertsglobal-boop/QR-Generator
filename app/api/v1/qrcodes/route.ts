import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/server";
import { setDestination } from "@/lib/kv";
import { generateSlug } from "@/lib/slug";

function validDestination(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

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

  let body: { destination_url?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!validDestination(body.destination_url)) {
    return NextResponse.json(
      { error: "destination_url must be a valid http(s) URL" },
      { status: 400 },
    );
  }
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;

  // Insert with a fresh slug, retrying on the rare unique-slug collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const short_slug = generateSlug();
    const { data, error } = await supabase
      .from("qr_codes")
      .insert({ user_id: user.id, short_slug, destination_url: body.destination_url, name })
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
export async function GET() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("qr_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
