import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbError } from "@/lib/api-error";

const REDIRECT_DOMAIN = process.env.NEXT_PUBLIC_REDIRECT_DOMAIN;

const COLUMNS = [
  "name",
  "short_slug",
  "tracking_url",
  "destination_url",
  "scan_count",
  "is_active",
  "tags",
  "created_at",
] as const;

function csvCell(value: unknown): string {
  let s = value == null ? "" : Array.isArray(value) ? value.join(" ") : String(value);
  // Neutralize spreadsheet formula injection: a leading =,+,-,@,tab,CR makes the
  // cell a formula when opened in Excel/Sheets. Prefix with an apostrophe.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/v1/qrcodes/export — download the caller's codes as CSV.
export const GET = withAuth(
  async (_request, auth) => {
    const { data, error } = await auth.db
      .from("qr_codes")
      .select("name, short_slug, destination_url, scan_count, is_active, tags, created_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) return dbError(error);

    const lines = [COLUMNS.join(",")];
    for (const row of data ?? []) {
      const enriched = { ...row, tracking_url: `${REDIRECT_DOMAIN}/r/${row.short_slug}` };
      lines.push(COLUMNS.map((col) => csvCell(enriched[col as keyof typeof enriched])).join(","));
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="qrcodes-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  },
  { scope: "qrcodes:read" },
);

export { preflight as OPTIONS } from "@/lib/cors";
