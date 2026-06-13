import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

// GET /api/v1/qrcodes/[id]/analytics?days=30 — per-day scan timeseries.
// Ownership is enforced inside the get_scan_timeseries RPC (raises Forbidden).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const daysParam = Number(new URL(request.url).searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 365 ? daysParam : 30;

  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const toDate = (d: Date) => d.toISOString().slice(0, 10);

  const { data, error } = await supabase.rpc("get_scan_timeseries", {
    p_qr_code_id: id,
    p_start: toDate(start),
    p_end: toDate(end),
  });

  if (error) {
    const forbidden = error.message?.includes("Forbidden");
    return NextResponse.json(
      { error: forbidden ? "Forbidden" : error.message },
      { status: forbidden ? 403 : 400 },
    );
  }

  return NextResponse.json({ days, series: data ?? [] });
}
