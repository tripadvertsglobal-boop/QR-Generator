"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/app/_components/ui/Button";
import { Input } from "@/app/_components/ui/Input";
import type { Folder } from "./types";

// Rendered as an indented submenu under the "QR codes" nav item in
// DashboardShell. `sectionActive` is true only when the QR codes section is
// the current route, so folder rows never highlight while on other pages.
export default function FolderSidebar({
  folders,
  counts,
  total,
  unfiled,
  sectionActive,
  onNavigate,
}: {
  folders: Folder[];
  counts: Record<string, number>;
  total: number;
  unfiled: number;
  sectionActive: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const activeFolder = useSearchParams().get("folder");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [error, setError] = useState<string | null>(null);

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/v1/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Failed");
      return;
    }
    setName("");
    setAdding(false);
    router.refresh();
  }

  async function deleteFolder(id: string) {
    if (!confirm("Delete this folder? Its QR codes stay, just unfiled.")) return;
    await fetch(`/api/v1/folders/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const rowCls = (active: boolean) =>
    `flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-brand-tint text-brand" : "text-muted hover:bg-black/[0.04] hover:text-foreground"
    }`;

  return (
    <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={rowCls(sectionActive && activeFolder === null)}
      >
        <span>All codes</span>
        <span className="tabular-nums text-muted-2">{total}</span>
      </Link>
      <Link
        href="/dashboard?folder=none"
        onClick={onNavigate}
        className={rowCls(sectionActive && activeFolder === "none")}
      >
        <span>Unfiled</span>
        <span className="tabular-nums text-muted-2">{unfiled}</span>
      </Link>

      <div className="mt-3 mb-1 flex items-center justify-between px-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
          Folders
        </span>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs font-medium text-brand hover:underline"
        >
          {adding ? "Cancel" : "+ New"}
        </button>
      </div>

      {adding && (
        <form onSubmit={createFolder} className="mb-2 flex flex-col gap-2 px-1">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-border bg-surface p-1"
            />
            <Input
              autoFocus
              required
              placeholder="Folder name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm">Add folder</Button>
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </form>
      )}

      {folders.map((f) => (
        <div key={f.id} className={rowCls(sectionActive && activeFolder === f.id)}>
          <Link
            href={`/dashboard?folder=${f.id}`}
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: f.color ?? "#9ca3af" }}
            />
            <span className="truncate">{f.name}</span>
          </Link>
          <span className="ml-2 tabular-nums text-muted-2">{counts[f.id] ?? 0}</span>
          <button
            onClick={() => deleteFolder(f.id)}
            title="Delete folder"
            aria-label={`Delete folder ${f.name}`}
            className="ml-1.5 text-muted-2 hover:text-rose-600"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
