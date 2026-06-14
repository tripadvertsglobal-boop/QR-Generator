import Link from "next/link";
import { notFound } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
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

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-brand underline">
        ← Back to dashboard
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold">{code.name ?? "Untitled"}</h1>
        <a
          href={`${REDIRECT_DOMAIN}/r/${code.short_slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-brand underline"
        >
          {REDIRECT_DOMAIN}/r/{code.short_slug}
        </a>
        <p className="mt-1 truncate text-sm text-black/60 dark:text-white/60">
          → {code.destination_url}
        </p>
        <p className="mt-2 text-sm">
          <span className="font-medium">{code.scan_count}</span> total scans ·{" "}
          {code.is_active ? "active" : "paused"}
        </p>
      </header>

      <section className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/v1/qrcodes/${code.id}/qr.svg`}
          alt={`QR code for ${code.short_slug}`}
          width={176}
          height={176}
          className="h-44 w-44 rounded-lg border border-black/10 bg-white p-2 dark:border-white/15"
        />
        <div className="flex flex-col gap-2">
          <CopyButton value={`${REDIRECT_DOMAIN}/r/${code.short_slug}`} />
          <a
            href={`/api/v1/qrcodes/${code.id}/qr.svg`}
            download={`qr-${code.short_slug}.svg`}
            className="rounded-md border border-black/15 px-3 py-1.5 text-center text-sm dark:border-white/20"
          >
            Download SVG
          </a>
          <a
            href={`/api/v1/qrcodes/${code.id}/qr.svg?format=png`}
            download={`qr-${code.short_slug}.png`}
            className="rounded-md border border-black/15 px-3 py-1.5 text-center text-sm dark:border-white/20"
          >
            Download PNG
          </a>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">
          Scans (last 30 days)
        </h2>
        <ScanChart qrId={code.id} />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">
          Scans by country
        </h2>
        {countries.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">No scans recorded yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {countries.map((c) => (
              <li key={c.country} className="flex items-center justify-between text-sm">
                <span>{c.country}</span>
                <span className="text-black/60 dark:text-white/60">{c.scan_count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">
          Recent scans
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">No scans recorded yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
              <tr>
                <th className="py-2">Time</th>
                <th className="py-2">Location</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s, i) => (
                <tr key={i} className="border-t border-black/10 dark:border-white/10">
                  <td className="py-2 text-black/60 dark:text-white/60">
                    {new Date(s.scanned_at).toLocaleString()}
                  </td>
                  <td className="py-2">{place(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

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
