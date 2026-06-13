import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/server";
import { setDestination, delDestination } from "@/lib/kv";
import { generateSlug } from "@/lib/slug";
import { bulkCreateSchema, bulkDeleteSchema } from "@/lib/validation";

const REDIRECT_DOMAIN = process.env.NEXT_PUBLIC_REDIRECT_DOMAIN;

// POST /api/v1/qrcodes/bulk — create up to 100 codes in one batch.
export async function POST(request: Request) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  // Insert the whole batch; retry with fresh slugs if a (rare) collision occurs.
  for (let attempt = 0; attempt < 5; attempt++) {
    const rows = parsed.data.codes.map((c) => ({
      user_id: user.id,
      short_slug: generateSlug(),
      destination_url: c.destination_url,
      name: c.name ?? null,
      folder_id: c.folder_id ?? null,
      tags: c.tags ?? [],
    }));

    const { data, error } = await supabase.from("qr_codes").insert(rows).select();
    if (error) {
      if (error.code === "23505") continue;
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await Promise.all(data.map((row) => setDestination(row.short_slug, row.destination_url)));
    const result = data.map((row) => ({
      ...row,
      tracking_url: `${REDIRECT_DOMAIN}/r/${row.short_slug}`,
    }));
    return NextResponse.json({ created: result.length, codes: result }, { status: 201 });
  }

  return NextResponse.json(
    { error: "Could not allocate unique slugs, please retry" },
    { status: 503 },
  );
}

// DELETE /api/v1/qrcodes/bulk — delete up to 100 codes by id and evict from KV.
export async function DELETE(request: Request) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  // RLS scopes the delete to the owner; foreign ids simply match nothing.
  const { data, error } = await supabase
    .from("qr_codes")
    .delete()
    .in("id", parsed.data.ids)
    .select("short_slug");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await Promise.all((data ?? []).map((row) => delDestination(row.short_slug)));
  return NextResponse.json({ deleted: data?.length ?? 0 });
}
