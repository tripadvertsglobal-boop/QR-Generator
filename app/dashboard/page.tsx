import Link from "next/link";
import { createUserClient } from "@/lib/supabase/server";
import { limitsFor } from "@/lib/plan";
import { cn } from "@/lib/cn";
import { buttonClasses } from "@/app/_components/ui/Button";
import CreateQrForm from "./CreateQrForm";
import TagFilterBar from "./TagFilterBar";
import QrList from "./QrList";
import type { Folder, QrCode } from "./types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; tag?: string; archived?: string }>;
}) {
  const { folder = null, tag = null, archived } = await searchParams;
  const viewingArchived = archived === "1";
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: folderData }, { data: codeData }, { data: profile }] = await Promise.all([
    supabase.from("folders").select("id, name, color").order("name"),
    supabase
      .from("qr_codes")
      .select(
        "id, short_slug, destination_url, name, is_active, archived_at, scan_count, folder_id, tags, active_from, active_until, ab_destinations, password_hash, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("user_profiles").select("plan").maybeSingle(),
  ]);

  const limits = limitsFor(profile?.plan);
  const folders = (folderData ?? []) as Folder[];
  // Map to has_password and drop the hash before it reaches client components.
  const allCodes: QrCode[] = (codeData ?? []).map((row) => {
    const { password_hash, ...rest } = row as Record<string, unknown> & { password_hash: string | null };
    return { ...rest, has_password: !!password_hash } as QrCode;
  });

  const liveCodes = allCodes.filter((c) => !c.archived_at);
  const archivedCount = allCodes.length - liveCodes.length;

  // Collect the tag set for the filter bar (folder counts now live in the shell).
  const tagSet = new Set<string>();
  for (const c of liveCodes) {
    for (const t of c.tags) tagSet.add(t);
  }

  // Apply the archive/folder/tag filter for display.
  const visible = allCodes.filter((c) => {
    if (viewingArchived !== !!c.archived_at) return false;
    if (folder === "none" && c.folder_id !== null) return false;
    if (folder && folder !== "none" && c.folder_id !== folder) return false;
    if (tag && !c.tags.includes(tag)) return false;
    return true;
  });

  // On a capped plan, show usage against the cap so the limit is visible before
  // a create is rejected with 402. Archived codes don't consume quota, so the
  // count here is of live codes only — matching what the API enforces.
  const usage =
    limits.maxQrCodes === Infinity
      ? `${liveCodes.length} ${liveCodes.length === 1 ? "code" : "codes"}`
      : `${liveCodes.length} of ${limits.maxQrCodes} codes`;

  // Stat band. Everything here is derived from the rows already loaded above —
  // no extra queries, no numbers the list itself can't account for.
  const totalScans = liveCodes.reduce((sum, c) => sum + c.scan_count, 0);
  const unfiled = liveCodes.filter((c) => c.folder_id === null).length;
  const perCode = liveCodes.length ? Math.round(totalScans / liveCodes.length) : 0;
  const topCode = liveCodes.reduce<QrCode | null>(
    (best, c) => (best === null || c.scan_count > best.scan_count ? c : best),
    null,
  );
  const topShare = totalScans > 0 && topCode ? Math.round((topCode.scan_count / totalScans) * 100) : 0;

  const stats = [
    {
      label: "Scans · all time",
      value: totalScans.toLocaleString(),
      delta: `${liveCodes.length} live`,
      note: `${perCode.toLocaleString()} per code average`,
    },
    {
      label: "Live codes",
      value: String(liveCodes.length),
      delta: limits.maxQrCodes === Infinity ? "no cap" : `of ${limits.maxQrCodes}`,
      deltaAccent: limits.maxQrCodes !== Infinity && liveCodes.length >= limits.maxQrCodes,
      note: `${archivedCount} archived · ${unfiled} unfiled`,
    },
    {
      label: "Top code",
      value: topCode ? `${topShare}%` : "—",
      delta: topCode ? "share" : "",
      note: topCode ? (topCode.name ?? `/r/${topCode.short_slug}`) : "No scans recorded yet",
    },
    {
      label: "Archived",
      value: String(archivedCount),
      delta: archivedCount > 0 ? "restorable" : "",
      note: "Slug and scan history are kept",
    },
  ];

  return (
    <main>
      {/* Title band */}
      <div className="flex flex-col gap-3 border-b-2 border-border px-5 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight tracking-[-0.03em] sm:text-[32px]">
            {viewingArchived ? "Archived QR codes" : "QR codes"}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {viewingArchived
              ? "Retired codes. They no longer resolve, but their scan history and slug are kept — restore one to bring it back."
              : `${usage} · ${user?.email ?? ""}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {viewingArchived ? (
            <Link href="/dashboard" className={buttonClasses("secondary", "sm")}>
              Back to active
            </Link>
          ) : archivedCount > 0 ? (
            <Link href="/dashboard?archived=1" className={buttonClasses("secondary", "sm")}>
              Archived ({archivedCount})
            </Link>
          ) : null}
        </div>
      </div>

      {!viewingArchived && (
        <>
          {/* Stat band — four cells reading the live library at a glance. */}
          <div className="grid grid-cols-2 border-b-2 border-border lg:grid-cols-4">
            {stats.map((s, i) => (
              <Stat
                key={s.label}
                {...s}
                // Two columns then four: the rules have to know which cell sits
                // against an edge at each breakpoint.
                className={cn(
                  i % 2 === 0 && "border-r",
                  i === 1 && "lg:border-r",
                  i < 2 && "border-b lg:border-b-0",
                )}
              />
            ))}
          </div>

          <div className="border-b-2 border-border">
            <CreateQrForm folders={folders} />
          </div>
          <TagFilterBar tags={[...tagSet].sort()} activeTag={tag} folder={folder} />
        </>
      )}

      <QrList
        codes={visible}
        folders={folders}
        canExport={limits.bulkOperations}
        canArchive={limits.archiving}
        viewingArchived={viewingArchived}
      />
    </main>
  );
}

// One cell of the stat band. Which edges carry a rule is the caller's call —
// it depends on where the cell lands in the grid at each breakpoint.
function Stat({
  label,
  value,
  delta,
  deltaAccent = false,
  note,
  className,
}: {
  label: string;
  value: string;
  delta: string;
  deltaAccent?: boolean;
  note: string;
  className?: string;
}) {
  return (
    <div className={cn("border-border px-5 py-4 sm:px-8 lg:px-5", className)}>
      <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted">{label}</h2>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[34px] font-extrabold leading-none tracking-[-0.03em]">{value}</span>
        {delta && (
          <span
            className={`text-xs font-extrabold ${deltaAccent ? "text-brand" : "text-neutral-600"}`}
          >
            {delta}
          </span>
        )}
      </div>
      <p className="mt-1 truncate text-[11px] text-muted" title={note}>
        {note}
      </p>
    </div>
  );
}
