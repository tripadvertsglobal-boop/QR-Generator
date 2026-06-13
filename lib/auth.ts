import { NextResponse, after } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { createUserClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hashKey } from "@/lib/apikey";
import { checkRateLimit } from "@/lib/rate-limit";
import { corsHeaders, applyHeaders } from "@/lib/cors";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// A session (JWT) can do everything in the dashboard; API keys are limited to
// the scopes stored on the key and can never manage keys/account.
export const JWT_SCOPES = [
  "qrcodes:read",
  "qrcodes:write",
  "folders:read",
  "folders:write",
  "keys:read",
  "keys:write",
  "account:read",
  "account:write",
];

export type AuthContext = {
  userId: string;
  authType: "jwt" | "apikey";
  scopes: string[];
  rateLimit: number;
  keyId?: string;
  // RLS-scoped client for JWT; service client (RLS-bypassing) for API keys.
  // IMPORTANT: under API-key auth every query MUST be scoped by `userId`.
  db: SupabaseClient;
};

const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;
const redis = kvUrl && kvToken ? new Redis({ url: kvUrl, token: kvToken }) : null;

type CachedKey = {
  id: string;
  user_id: string;
  scopes: string[];
  rate_limit: number;
  is_active: boolean;
  expires_at: string | null;
};

const keyCacheKey = (hash: string) => `apikey:${hash}`;

// Purge a key from the KV cache on revoke/delete (plan 5.4).
export async function purgeApiKeyCache(hash: string): Promise<void> {
  if (redis) await redis.del(keyCacheKey(hash));
}

async function resolveApiKey(raw: string): Promise<AuthContext | null> {
  const hash = hashKey(raw);
  let record: CachedKey | null = redis ? await redis.get<CachedKey>(keyCacheKey(hash)) : null;

  if (!record) {
    const { data } = await createServiceClient()
      .from("api_keys")
      .select("id, user_id, scopes, rate_limit, is_active, expires_at")
      .eq("key_hash", hash)
      .maybeSingle();
    if (!data) return null;
    record = data as CachedKey;
    if (redis) await redis.set(keyCacheKey(hash), record, { ex: 60 });
  }

  if (!record.is_active) return null;
  if (record.expires_at && new Date(record.expires_at) < new Date()) return null;

  // Touch last_used_at without blocking the request.
  after(async () => {
    try {
      await createServiceClient()
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", record!.id);
    } catch {
      /* ignore */
    }
  });

  return {
    userId: record.user_id,
    authType: "apikey",
    scopes: record.scopes,
    rateLimit: record.rate_limit,
    keyId: record.id,
    db: createServiceClient(),
  };
}

async function resolveBearer(jwt: string): Promise<AuthContext | null> {
  const db = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await db.auth.getUser(jwt);
  if (!user) return null;
  return { userId: user.id, authType: "jwt", scopes: JWT_SCOPES, rateLimit: 200, db };
}

async function resolveCookie(): Promise<AuthContext | null> {
  const db = await createUserClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  return { userId: user.id, authType: "jwt", scopes: JWT_SCOPES, rateLimit: 200, db };
}

export async function resolveAuth(request: Request): Promise<AuthContext | null> {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) return resolveApiKey(apiKey);

  const authz = request.headers.get("authorization");
  if (authz?.startsWith("Bearer ")) return resolveBearer(authz.slice(7));

  return resolveCookie();
}

type WithAuthOptions = { scope?: string; jwtOnly?: boolean };

/**
 * Wraps an API route handler with: CORS (incl. OPTIONS preflight), dual auth
 * (session JWT or X-API-Key), scope + jwt-only gating, and KV rate limiting
 * (per-key or per-user). The wrapped handler receives the resolved AuthContext.
 */
export function withAuth<C>(
  handler: (request: Request, auth: AuthContext, context: C) => Promise<Response> | Response,
  opts: WithAuthOptions = {},
) {
  return async (request: Request, context: C): Promise<Response> => {
    const cors = corsHeaders(request.headers.get("origin"));

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: cors });
    }

    const auth = await resolveAuth(request);
    if (!auth) {
      return applyHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), cors);
    }

    if (opts.jwtOnly && auth.authType !== "jwt") {
      return applyHeaders(
        NextResponse.json({ error: "This endpoint requires session authentication" }, { status: 403 }),
        cors,
      );
    }

    if (opts.scope && !auth.scopes.includes(opts.scope)) {
      return applyHeaders(
        NextResponse.json({ error: `Missing required scope: ${opts.scope}` }, { status: 403 }),
        cors,
      );
    }

    const identity = auth.authType === "apikey" ? `key:${auth.keyId}` : `user:${auth.userId}`;
    const rl = await checkRateLimit(identity, auth.rateLimit);
    const rlHeaders = {
      "X-RateLimit-Limit": String(rl.limit),
      "X-RateLimit-Remaining": String(rl.remaining),
      "X-RateLimit-Reset": String(rl.reset),
    };
    if (!rl.ok) {
      return applyHeaders(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 }),
        { ...cors, ...rlHeaders },
      );
    }

    const res = await handler(request, auth, context);
    return applyHeaders(res, { ...cors, ...rlHeaders });
  };
}
