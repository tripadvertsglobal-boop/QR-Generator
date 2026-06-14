"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Folder } from "./types";

export default function FolderSidebar({
  folders,
  counts,
  total,
  unfiled,
  activeFolder,
}: {
  folders: Folder[];
  counts: Record<string, number>;
  total: number;
  unfiled: number;
  activeFolder: string | null;
}) {
  const router = useRouter();
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
    `flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
      active ? "bg-black/10 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/5"
    }`;

  return (
    <aside className="flex w-full shrink-0 flex-col gap-1 sm:w-56">
      <Link href="/dashboard" className={rowCls(activeFolder === null)}>
        <span>All codes</span>
        <span className="text-black/50 dark:text-white/50">{total}</span>
      </Link>
      <Link href="/dashboard?folder=none" className={rowCls(activeFolder === "none")}>
        <span>Unfiled</span>
        <span className="text-black/50 dark:text-white/50">{unfiled}</span>
      </Link>

      <div className="mt-2 mb-1 flex items-center justify-between px-2">
        <span className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
          Folders
        </span>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs text-brand hover:underline"
        >
          {adding ? "Cancel" : "+ New"}
        </button>
      </div>

      {adding && (
        <form onSubmit={createFolder} className="mb-2 flex flex-col gap-2 px-2">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-7 w-7 rounded border border-black/15 dark:border-white/20"
            />
            <input
              autoFocus
              required
              placeholder="Folder name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm outline-none dark:border-white/20"
            />
          </div>
          <button className="rounded-md bg-brand hover:bg-brand-hover px-2 py-1 text-xs text-brand-foreground">Add folder</button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
      )}

      {folders.map((f) => (
        <div key={f.id} className={rowCls(activeFolder === f.id)}>
          <Link href={`/dashboard?folder=${f.id}`} className="flex flex-1 items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: f.color ?? "#9ca3af" }}
            />
            <span className="truncate">{f.name}</span>
          </Link>
          <span className="ml-2 text-black/50 dark:text-white/50">{counts[f.id] ?? 0}</span>
          <button
            onClick={() => deleteFolder(f.id)}
            title="Delete folder"
            className="ml-2 text-black/30 hover:text-red-500 dark:text-white/30"
          >
            ×
          </button>
        </div>
      ))}
    </aside>
  );
}
