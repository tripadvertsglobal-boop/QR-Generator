import { notFound } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
import Badge from "@/app/_components/ui/Badge";
import { buttonClasses } from "@/app/_components/ui/Button";
import ScanChart from "./ScanChart";
import CopyButton from "./CopyButton";
import AdvancedSettings from "./AdvancedSettings";

const REDIRECT_DOMAIN = process.env.NEXT_PUBLIC_REDIRECT_DOMAIN ?? "";

export default async function QrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createUserClient();

  // RLS scopes this to the owner; a foreign/unknown id returns no row -> 404.
  const { data: code } = await supabase
    .from("qr_codes")
    .select(
      "id, short_slug, destination_url, name, is_active, scan_count, active_from, active_until, ab_destinations, password_hash",
    )
    .eq("id", id)
    .maybeSingle();

  if (!code) notFound();
  const hasPassword = !!code.password_hash;

  // Scan geography. Recent scans come straight from scan_logs (RLS-scoped to the
  // owner); the country breakdown uses the ownership-guarded get_scan_geo RPC.
  // Fixed all-time bounds keep this render pure (no Date.now()).
  const [{ data: recentScans }, { data: geo }] = await Promise.all([
    supabase
      .from("scan_logs")
      .select("scanned_at, country, region, city")
      .eq("qr_code_id", code.id)
      .order("scanned_at", { ascending: false })
      .limit(50),
    supabase.rpc("get_scan_geo", {
      p_qr_code_id: code.id,
      p_start: "2020-01-01",
      p_end: "2099-12-31",
    }),
  ]);
  const recent = (recentScans ?? []) as {
    scanned_at: string;
    country: string | null;
    region: string | null;
    city: string | null;
  }[];
  const countries = (geo ?? []) as { country: string; scan_count: number }[];
  const place = (s: { city: string | null; region: string | null; country: string | null }) =>
    [s.city, s.region, s.country].filter(Boolean).join(", ") || "Unknown";

  const maxCountry = Math.max(1, ...countries.map((c) => Number(c.scan_count)));

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{code.name ?? "Untitled"}</h1>
          <Badge tone={code.is_active ? "emerald" : "gray"} dot>
            {code.is_active ? "Active" : "Paused"}
          </Badge>
        </div>
        <a
          href={`${REDIRECT_DOMAIN}/r/${code.short_slug}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block font-mono text-sm text-brand hover:underline"
        >
          {REDIRECT_DOMAIN}/r/{code.short_slug}
        </a>
        <p className="mt-1 truncate text-sm text-muted">→ {code.destination_url}</p>
      </header>

      <section className="mb-8 flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 shadow-card sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/v1/qrcodes/${code.id}/qr.svg`}
          alt={`QR code for ${code.short_slug}`}
          width={176}
          height={176}
          className="h-40 w-40 shrink-0 self-center rounded-lg border border-border bg-white p-2 sm:self-auto"
        />
        <div className="flex flex-1 flex-col gap-3">
          <div>
            <p className="text-3xl font-semibold tabular-nums">{code.scan_count.toLocaleString()}</p>
            <p className="text-sm text-muted">total scans</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton value={`${REDIRECT_DOMAIN}/r/${code.short_slug}`} />
            <a href={`/api/v1/qrcodes/${code.id}/qr.svg`} download={`qr-${code.short_slug}.svg`} className={buttonClasses("secondary", "sm")}>
              SVG
            </a>
            <a href={`/api/v1/qrcodes/${code.id}/qr.svg?format=png`} download={`qr-${code.short_slug}.png`} className={buttonClasses("secondary", "sm")}>
              PNG
            </a>
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-4 text-sm font-semibold">Scans · last 30 days</h2>
        <ScanChart qrId={code.id} />
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold">Scans by country</h2>
          {countries.length === 0 ? (
            <p className="text-sm text-muted-2">No scans recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {countries.map((c) => (
                <li key={c.country} className="flex items-center gap-3 text-sm">
                  <span className="w-8 shrink-0 font-medium">{c.country}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${(Number(c.scan_count) / maxCountry) * 100}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right tabular-nums text-muted">{c.scan_count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold">Recent scans</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-2">No scans recorded yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {recent.slice(0, 12).map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate text-muted">{place(s)}</span>
                  <time className="shrink-0 whitespace-nowrap text-xs text-muted-2">
                    {new Date(s.scanned_at).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <AdvancedSettings
        id={code.id}
        activeFrom={code.active_from}
        activeUntil={code.active_until}
        hasPassword={hasPassword}
        ab={code.ab_destinations}
      />
    </main>
  );
}
