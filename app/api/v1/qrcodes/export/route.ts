import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

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
  const s = value == null ? "" : Array.isArray(value) ? value.join(" ") : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/v1/qrcodes/export — download the caller's codes as CSV.
export async function GET() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("qr_codes")
    .select("name, short_slug, destination_url, scan_count, is_active, tags, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

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
}
