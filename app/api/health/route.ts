import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/health — liveness + dependency check for uptime monitoring.
// Public and cheap: it reports whether the process is up and whether Postgres
// answers, without exposing versions, config, or row data.
export const dynamic = "force-dynamic";

export async function GET() {
  let database = false;
  try {
    // head+count touches the connection without transferring rows.
    const { error } = await createServiceClient()
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .limit(1);
    database = !error;
  } catch {
    database = false;
  }

  return NextResponse.json(
    { status: database ? "ok" : "degraded", database },
    {
      status: database ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
