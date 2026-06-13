"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Folder } from "./types";

export default function CreateQrForm({ folders }: { folders: Folder[] }) {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await fetch("/api/v1/qrcodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination_url: destination,
        name: name.trim() || null,
        folder_id: folderId || null,
        tags,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }
    setDestination("");
    setName("");
    setTagsText("");
    router.refresh();
  }

  const inputCls =
    "rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50";

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-black/60 dark:text-white/60">Destination URL</span>
          <input
            type="url"
            required
            placeholder="https://example.com"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 sm:w-40">
          <span className="text-xs text-black/60 dark:text-white/60">Name (optional)</span>
          <input
            type="text"
            placeholder="Spring flyer"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 sm:w-48">
          <span className="text-xs text-black/60 dark:text-white/60">Folder</span>
          <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className={inputCls}>
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-black/60 dark:text-white/60">Tags (comma-separated)</span>
          <input
            type="text"
            placeholder="print, q2-campaign"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            className={inputCls}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {loading ? "…" : "Create"}
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
