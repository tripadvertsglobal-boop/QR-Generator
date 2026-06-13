import Link from "next/link";
import { notFound } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
import ScanChart from "./ScanChart";
import CopyButton from "./CopyButton";

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
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!code) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-blue-600 underline">
        ← Back to dashboard
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold">{code.name ?? "Untitled"}</h1>
        <a
          href={`${REDIRECT_DOMAIN}/r/${code.short_slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-600 underline"
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
    </main>
  );
}
