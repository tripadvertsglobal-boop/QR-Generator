import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/server";
import { setDestination, delDestination } from "@/lib/kv";
import { updateQrSchema } from "@/lib/validation";

// PATCH /api/v1/qrcodes/[id] — update destination / is_active / name and keep the
// KV cache in sync so printed codes re-route (or pause) on the very next scan.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const parsed = updateQrSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // RLS scopes the update to the owner; a non-owner id yields no row.
  const { data, error } = await supabase
    .from("qr_codes")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Sync the edge cache: drop paused codes, (re)warm active ones.
  if (data.is_active) {
    await setDestination(data.short_slug, data.destination_url);
  } else {
    await delDestination(data.short_slug);
  }

  return NextResponse.json(data);
}

// DELETE /api/v1/qrcodes/[id] — remove the row (RLS-scoped) and evict from KV.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("qr_codes")
    .delete()
    .eq("id", id)
    .select("short_slug")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await delDestination(data.short_slug);
  return NextResponse.json({ success: true });
}
