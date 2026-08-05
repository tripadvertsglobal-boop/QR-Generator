import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/server";
import { afterAuthPath, checkoutPlan } from "@/lib/checkout-intent";

// OAuth providers redirect here with ?code=. Exchanging it server-side writes
// the session cookie before the redirect, so middleware.ts sees the session on
// the very next request and lets /dashboard through.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  // Survives the provider round trip because AuthForm puts it on redirectTo.
  // Anything not a known plan narrows to null and lands on the dashboard, so
  // this cannot be used to bounce a freshly authenticated user off-site.
  const plan = checkoutPlan(request.nextUrl.searchParams.get("plan"));

  if (code) {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(afterAuthPath(plan), request.url));
  }

  return NextResponse.redirect(new URL("/login?error=oauth", request.url));
}
