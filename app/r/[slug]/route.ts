import { NextResponse, after, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getConfig, setConfig } from "@/lib/kv";
import { scheduleState, pickDestination, type SlugConfig } from "@/lib/slug-config";
import { unlockCookieName, verifyUnlockToken } from "@/lib/link-token";

export const runtime = "edge";

const BACKFILL_TTL_SECONDS = 60 * 60 * 24;

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

// GET /r/<slug> — resolve a dynamic QR. Resolution order (Appendix F):
// KV (miss -> resolve_slug_config + backfill) -> schedule/active -> password
// gate -> A/B pick -> fire-and-forget scan -> 302. Latency stays on the KV path.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let config = await getConfig(slug);

  if (!config) {
    const { data } = await anonClient()
      .rpc("resolve_slug_config", { p_slug: slug })
      .maybeSingle<{
        destination_url: string;
        is_active: boolean;
        active_from: string | null;
        active_until: string | null;
        has_password: boolean;
        ab_destinations: SlugConfig["ab"];
      }>();

    if (data) {
      config = {
        destination_url: data.destination_url,
        is_active: data.is_active,
        active_from: data.active_from,
        active_until: data.active_until,
        has_password: data.has_password,
        ab: data.ab_destinations,
      };
      await setConfig(slug, config, BACKFILL_TTL_SECONDS);
    }
  }

  if (!config) return new NextResponse("Not found", { status: 404 });

  // Scheduling + active state.
  switch (scheduleState(config)) {
    case "paused":
    case "expired":
      return new NextResponse("This link is no longer active", { status: 410 });
    case "not_started":
      return new NextResponse("This link is not active yet", { status: 404 });
  }

  // Password gate — require a valid unlock cookie, else show the interstitial.
  if (config.has_password) {
    const token = request.cookies.get(unlockCookieName(slug))?.value;
    if (!(await verifyUnlockToken(slug, token))) {
      return NextResponse.redirect(new URL(`/r/${slug}/unlock`, request.url), 302);
    }
  }

  const destination = pickDestination(config);

  const h = request.headers;
  after(async () => {
    await anonClient().rpc("record_scan", {
      p_slug: slug,
      p_country: h.get("x-vercel-ip-country"),
      p_region: h.get("x-vercel-ip-country-region"),
      p_city: h.get("x-vercel-ip-city"),
      p_referer: h.get("referer"),
    });
  });

  return NextResponse.redirect(destination, 302);
}
