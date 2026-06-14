import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/cron/audit-retention — purge audit_logs older than 90 days.
// Invoked by Vercel Cron (see vercel.json). Protected by CRON_SECRET: Vercel
// sends `Authorization: Bearer <CRON_SECRET>` when the env var is set.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { error, count } = await createServiceClient()
    .from("audit_logs")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ purged: count ?? 0, cutoff });
}
