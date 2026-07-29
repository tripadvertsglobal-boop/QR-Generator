import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session on every matched request and gates the
// dashboard behind login.
//
// Next.js 16 renamed this convention to `proxy.ts`, and this file was `proxy.ts`
// until the move to Cloudflare Workers. Next hard-codes `proxy.ts` to the
// Node.js runtime (build/utils.js `isProxyFile`), and @opennextjs/cloudflare
// only supports edge middleware — it aborts the build on a Node one. The
// still-supported `middleware.ts` name builds to the edge runtime, which the
// adapter can run. Nothing here needs Node APIs, so the runtime is a free
// choice. Rename back to `proxy.ts` once OpenNext supports Node middleware.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything except static assets, the public redirect engine (/r/*),
  // and API routes (which authenticate themselves).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|r/|api/).*)"],
};
