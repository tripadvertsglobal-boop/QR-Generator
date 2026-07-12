"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/_components/ui/Button";
import { buttonClasses } from "@/app/_components/ui/Button";
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
      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-muted">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-brand" />
          {selected.size > 0 ? `${selected.size} selected` : "Select all"}
        </label>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={deleteSelected} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
              Delete selected
            </Button>
          )}
          {/* File download endpoint, not a page — must be a real anchor. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/v1/qrcodes/export" className={buttonClasses("secondary", "sm")}>
            Export CSV
          </a>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {codes.length === 0 && (
          <li className="rounded-xl border border-dashed border-border bg-black/[0.015] px-6 py-12 text-center text-sm text-muted">
            No QR codes here yet.
          </li>
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
