import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { dbError } from "@/lib/api-error";

// GET /api/cron/audit-retention — purge audit_logs older than 90 days.
// Invoked by Vercel Cron (see vercel.json). Protected by CRON_SECRET: Vercel
// sends `Authorization: Bearer <CRON_SECRET>` when the env var is set.
// Fail closed: a missing secret in production must not leave the purge public.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { error, count } = await createServiceClient()
    .from("audit_logs")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);

  if (error) return dbError(error, 500);
  return NextResponse.json({ purged: count ?? 0, cutoff });
}
