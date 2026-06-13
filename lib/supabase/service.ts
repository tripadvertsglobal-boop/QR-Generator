import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Server-only; never import into client
 * code. Used for privileged writes (scan ingestion from M2 onward). The
 * Milestone 1 redirect deliberately uses the `resolve_slug` RPC instead, to
 * keep the service_role key off the edge.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
