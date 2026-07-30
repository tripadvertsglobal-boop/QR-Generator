import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

// OAuth providers redirect here with ?code=. Exchanging it server-side writes
// the session cookie before the redirect, so middleware.ts sees the session on
// the very next request and lets /dashboard through.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.redirect(new URL("/login?error=oauth", request.url));
}
