import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbError } from "@/lib/api-error";
import { fetchAllRows } from "@/lib/paginate";

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
    // Page through in .range() chunks — a single query is silently truncated
    // at PostgREST's max-rows, corrupting the export for large accounts.
    const { rows, error } = await fetchAllRows((from, to) =>
      auth.db
        .from("qr_codes")
        .select("name, short_slug, destination_url, scan_count, is_active, tags, created_at")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .range(from, to),
    );

    if (error) return dbError(error);

    const lines = [COLUMNS.join(",")];
    for (const row of rows) {
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
