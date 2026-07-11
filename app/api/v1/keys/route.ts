import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbError } from "@/lib/api-error";
import { generateApiKey, MAX_API_KEYS } from "@/lib/apikey";
import { logAudit, auditSnapshot } from "@/lib/audit";
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

    // Cap active keys per account. The DB trigger is the race-proof backstop;
    // this check returns a friendly error before we mint a key we can't keep.
    const { count, error: countError } = await auth.db
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.userId)
      .eq("is_active", true);

    if (countError) return dbError(countError);

    if ((count ?? 0) >= MAX_API_KEYS) {
      return NextResponse.json(
        { error: `API key limit reached (max ${MAX_API_KEYS} active keys per account). Revoke one first.` },
        { status: 409 },
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

    if (error) {
      // The DB trigger raises this exact message; surface it as a friendly 409.
      if (error.message.includes("API key limit reached")) {
        return NextResponse.json(
          { error: `API key limit reached (max ${MAX_API_KEYS} active keys per account). Revoke one first.` },
          { status: 409 },
        );
      }
      return dbError(error);
    }

    logAudit({
      userId: auth.userId,
      action: "key.create",
      resourceType: "api_key",
      resourceId: data.id,
      newValue: auditSnapshot(data),
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

    if (error) return dbError(error);
    return NextResponse.json(data);
  },
  { jwtOnly: true },
);

export { preflight as OPTIONS } from "@/lib/cors";
