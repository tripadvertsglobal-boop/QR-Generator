import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbError } from "@/lib/api-error";

// GET /api/v1/qrcodes/[id]/analytics?days=30 — per-day scan timeseries.
// JWT auth uses get_scan_timeseries (ownership via auth.uid()); API-key auth
// uses get_scan_timeseries_svc (service-role only), which checks ownership
// against the key's user id since auth.uid() is unset under service-role.
export const GET = withAuth(
  async (request, auth, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const daysParam = Number(new URL(request.url).searchParams.get("days"));
    const days = Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 365 ? daysParam : 30;

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    const toDate = (d: Date) => d.toISOString().slice(0, 10);

    const range = { p_qr_code_id: id, p_start: toDate(start), p_end: toDate(end) };
    const { data, error } =
      auth.authType === "apikey"
        ? await auth.db.rpc("get_scan_timeseries_svc", { ...range, p_user_id: auth.userId })
        : await auth.db.rpc("get_scan_timeseries", range);

    if (error) {
      if (error.message?.includes("Forbidden")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return dbError(error);
    }

    return NextResponse.json({ days, series: data ?? [] });
  },
  { scope: "qrcodes:read" },
);

export { preflight as OPTIONS } from "@/lib/cors";
