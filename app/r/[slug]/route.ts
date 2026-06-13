import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getDestination, setDestination } from "@/lib/kv";

export const runtime = "edge";

// KV backfill TTL on a cache miss — 24h, matching the plan's Appendix F.
const BACKFILL_TTL_SECONDS = 60 * 60 * 24;

// GET /r/<slug> — resolve a dynamic QR to its destination and 302.
// Fast path: Vercel KV. Miss: resolve_slug RPC (anon, active codes only) +
// backfill KV. Unknown/paused slug -> 404.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let destination = await getDestination(slug);

  if (!destination) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const { data } = await supabase
      .rpc("resolve_slug", { p_slug: slug })
      .maybeSingle<{ destination_url: string }>();

    if (data?.destination_url) {
      destination = data.destination_url;
      await setDestination(slug, destination, BACKFILL_TTL_SECONDS);
    }
  }

  if (!destination) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(destination, 302);
}
