import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * RLS-scoped Supabase client for Server Components and Route Handlers.
 * Reads/writes the session from cookies, so all queries run as the signed-in
 * user and Row-Level Security applies. `cookies()` is async in Next.js 16.
 */
export async function createUserClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll called from a Server Component — safe to ignore; the
            // session refresh happens in proxy.ts instead.
          }
        },
      },
    },
  );
}
