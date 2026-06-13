import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

// GET /api/v1/qrcodes/[id]/analytics?days=30 — per-day scan timeseries.
// JWT only: the get_scan_timeseries RPC enforces ownership via auth.uid(),
// which is unset under service-role (API-key) auth.
export const GET = withAuth(
  async (request, auth, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const daysParam = Number(new URL(request.url).searchParams.get("days"));
    const days = Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 365 ? daysParam : 30;

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    const toDate = (d: Date) => d.toISOString().slice(0, 10);

    const { data, error } = await auth.db.rpc("get_scan_timeseries", {
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
  },
  { jwtOnly: true },
);

export { preflight as OPTIONS } from "@/lib/cors";
