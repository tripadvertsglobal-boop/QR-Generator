"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/app/_components/ui/Button";
import { buttonClasses } from "@/app/_components/ui/Button";
import QrRow from "./QrRow";
import type { Folder, QrCode } from "./types";

export default function QrList({
  codes,
  folders = [],
  canExport,
  canArchive,
  viewingArchived = false,
}: {
  codes: QrCode[];
  folders?: Folder[];
  canExport: boolean;
  canArchive: boolean;
  viewingArchived?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // Folder names live on the page's folder list, not on the code row.
  const folderName = new Map(folders.map((f) => [f.id, f.name]));

  function onSelectChange(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const allSelected = codes.length > 0 && selected.size === codes.length;
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(codes.map((c) => c.id)));
  }

  async function archiveSelected(archived: boolean) {
    // Pro-gated; the API 402s. Send Free users to the plans page instead.
    if (!canArchive) {
      router.push("/pricing");
      return;
    }
    if (
      archived &&
      !confirm(
        `Archive ${selected.size} QR code(s)? Printed codes will stop working. You can restore them later.`,
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch("/api/v1/qrcodes/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], archived }),
    });
    setBusy(false);
    if (res.ok) {
      setSelected(new Set());
      router.refresh();
    }
  }

  async function deleteSelected() {
    if (!confirm(`Delete ${selected.size} QR code(s)? Printed codes will stop working.`)) return;
    setBusy(true);
    const res = await fetch("/api/v1/qrcodes/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    setBusy(false);
    if (res.ok) {
      setSelected(new Set());
      router.refresh();
    }
  }

  return (
    <div>
      {/* Bulk bar. Selection-scoped actions appear on the left as they become
          available; the always-available export stays anchored right. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-5 py-3 sm:px-8">
        <label className="flex items-center gap-2 text-[13px] font-extrabold">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 accent-brand"
          />
          {selected.size > 0 ? `${selected.size} selected` : "Select all"}
        </label>
        {selected.size > 0 && (
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => archiveSelected(!viewingArchived)}
              title={canArchive ? undefined : "Archiving is available on Pro"}
            >
              {viewingArchived ? "Restore selected" : "Archive selected"}
              {!canArchive && " ↑"}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={deleteSelected}>
              Delete selected
            </Button>
          </>
        )}
        <div className="ml-auto">
          {/* CSV export is Pro-gated: the endpoint 402s on Free, and this is a
              plain navigation, so without the check the browser would render the
              raw JSON error. Point at /pricing instead. */}
          {canExport ? (
            /* File download endpoint, not a page — must be a real anchor. */
            /* eslint-disable-next-line @next/next/no-html-link-for-pages */
            <a href="/api/v1/qrcodes/export" className={buttonClasses("secondary", "sm")}>
              Export CSV
            </a>
          ) : (
            <Link
              href="/pricing"
              title="CSV export is available on Pro"
              className={buttonClasses("secondary", "sm")}
            >
              Export CSV ↑
            </Link>
          )}
        </div>
      </div>

      {codes.length === 0 ? (
        <p className="px-5 py-16 text-center text-sm text-muted sm:px-8">
          {viewingArchived ? "Nothing archived." : "No QR codes here yet."}
        </p>
      ) : (
        <>
          {/* The ledger proper. Below `md` the same rows restack as cards —
              the columns stop fitting long before the content stops mattering. */}
          <table className="hidden w-full border-collapse text-sm md:table">
            <thead>
              <tr className="[&>th]:border-b-2 [&>th]:border-border [&>th]:text-[11px] [&>th]:font-extrabold [&>th]:uppercase [&>th]:tracking-[0.08em] [&>th]:text-muted">
                <th className="w-9 py-2 pl-5 pr-2 text-left sm:pl-8" />
                <th className="w-12 px-2 py-2 text-left" />
                <th className="min-w-[190px] px-2 py-2 text-left">Name / slug</th>
                <th className="min-w-[180px] px-2 py-2 text-left">Destination</th>
                <th className="min-w-[150px] px-2 py-2 text-left">Folder &amp; tags</th>
                <th className="w-24 px-2 py-2 text-right">Scans</th>
                <th className="w-28 px-2 py-2 text-left">State</th>
                <th className="w-px py-2 pl-2 pr-5 text-left sm:pr-8" />
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => (
                <QrRow
                  key={code.id}
                  code={code}
                  folderName={code.folder_id ? folderName.get(code.folder_id) : undefined}
                  selected={selected.has(code.id)}
                  onSelectChange={onSelectChange}
                  canArchive={canArchive}
                />
              ))}
            </tbody>
          </table>

          <ul className="md:hidden">
            {codes.map((code) => (
              <QrRow
                key={code.id}
                layout="card"
                code={code}
                folderName={code.folder_id ? folderName.get(code.folder_id) : undefined}
                selected={selected.has(code.id)}
                onSelectChange={onSelectChange}
                canArchive={canArchive}
              />
            ))}
          </ul>

          <div className="border-t-2 border-border px-5 py-3.5 text-xs text-muted sm:px-8">
            Showing {codes.length} {codes.length === 1 ? "code" : "codes"}
          </div>
        </>
      )}
    </div>
  );
}
