"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QrRow from "./QrRow";
import type { QrCode } from "./types";

export default function QrList({ codes }: { codes: QrCode[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-black/60 dark:text-white/60">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4" />
          {selected.size > 0 ? `${selected.size} selected` : "Select all"}
        </label>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={deleteSelected}
              disabled={busy}
              className="rounded-md border border-red-500/40 px-3 py-1.5 text-red-500 disabled:opacity-50"
            >
              Delete selected
            </button>
          )}
          {/* File download endpoint, not a page — must be a real anchor. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/v1/qrcodes/export"
            className="rounded-md border border-black/15 px-3 py-1.5 dark:border-white/20"
          >
            Export CSV
          </a>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {codes.length === 0 && (
          <li className="text-sm text-black/60 dark:text-white/60">No QR codes here yet.</li>
        )}
        {codes.map((code) => (
          <QrRow
            key={code.id}
            code={code}
            selected={selected.has(code.id)}
            onSelectChange={onSelectChange}
          />
        ))}
      </ul>
    </div>
  );
}
