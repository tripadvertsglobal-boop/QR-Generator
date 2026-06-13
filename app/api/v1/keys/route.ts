import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { generateApiKey } from "@/lib/apikey";
import { logAudit } from "@/lib/audit";
import { createKeySchema } from "@/lib/validation";

// POST /api/v1/keys — mint a key. JWT only (API keys can't create keys). The raw
// key is returned exactly once; only its SHA-256 hash is stored.
export const POST = withAuth(
  async (request, auth) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createKeySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const key = generateApiKey();
    const { data, error } = await auth.db
      .from("api_keys")
      .insert({
        user_id: auth.userId,
        name: parsed.data.name,
        key_hash: key.hash,
        key_prefix: key.prefix,
        scopes: parsed.data.scopes ?? ["qrcodes:read", "qrcodes:write"],
        rate_limit: parsed.data.rate_limit ?? 100,
        expires_at: parsed.data.expires_at ?? null,
      })
      .select("id, name, key_prefix, scopes, rate_limit, expires_at, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    logAudit({
      userId: auth.userId,
      action: "key.create",
      resourceType: "api_key",
      resourceId: data.id,
      newValue: { name: data.name, scopes: data.scopes },
      request,
    });

    // `key` is shown once; clients must store it now.
    return NextResponse.json({ ...data, key: key.raw }, { status: 201 });
  },
  { jwtOnly: true },
);

// GET /api/v1/keys — list the caller's keys (never returns the secret).
export const GET = withAuth(
  async (_request, auth) => {
    const { data, error } = await auth.db
      .from("api_keys")
      .select("id, name, key_prefix, scopes, rate_limit, is_active, last_used_at, expires_at, created_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  },
  { jwtOnly: true },
);

export { preflight as OPTIONS } from "@/lib/cors";
