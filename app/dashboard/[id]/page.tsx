import Link from "next/link";
import { notFound } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
import ScanChart from "./ScanChart";

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

      <section>
        <h2 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">
          Scans (last 30 days)
        </h2>
        <ScanChart qrId={code.id} />
      </section>
    </main>
  );
}
