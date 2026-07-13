import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase/service";
import { createUnlockToken, unlockCookieName } from "@/lib/link-token";
import { checkRateLimit } from "@/lib/rate-limit";

// POST /r/[slug]/verify — check a submitted password (bcrypt) and, on success,
// set an HMAC-signed unlock cookie the edge redirect can verify. Node runtime
// (bcrypt). Public endpoint.
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Throttle password guesses per-IP-per-slug to blunt brute force (no-ops
  // without KV configured).
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit(`verify:${slug}:${ip}`, 10);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts, try again shortly" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, rl.reset - Math.floor(Date.now() / 1000))) },
      },
    );
  }

  let password = "";
  try {
    password = (await request.json()).password ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!password) return NextResponse.json({ error: "Password required" }, { status: 400 });

  // Read the hash server-side with the service client — it is never exposed to
  // the anon role over PostgREST.
  const { data } = await createServiceClient()
    .from("qr_codes")
    .select("password_hash")
    .eq("short_slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data?.password_hash || !(await bcrypt.compare(password, data.password_hash))) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(unlockCookieName(slug), await createUnlockToken(slug), {
    path: `/r/${slug}`,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
  });
  return res;
}
