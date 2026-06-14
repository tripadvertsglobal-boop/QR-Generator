"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Folder, AbDestination } from "./types";
import AbBuilder from "./AbBuilder";

const inputCls =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50";

export default function CreateQrForm({ folders }: { folders: Folder[] }) {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [activeFrom, setActiveFrom] = useState("");
  const [activeUntil, setActiveUntil] = useState("");
  const [password, setPassword] = useState("");
  const [ab, setAb] = useState<AbDestination[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    const body: Record<string, unknown> = {
      destination_url: destination,
      name: name.trim() || null,
      folder_id: folderId || null,
      tags,
    };
    if (activeFrom) body.active_from = new Date(activeFrom).toISOString();
    if (activeUntil) body.active_until = new Date(activeUntil).toISOString();
    if (password) body.password = password;
    const arms = ab.filter((a) => a.url.trim());
    if (arms.length >= 2) body.ab_destinations = arms;

    const res = await fetch("/api/v1/qrcodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Something went wrong");
      return;
    }
    setDestination("");
    setName("");
    setTagsText("");
    setActiveFrom("");
    setActiveUntil("");
    setPassword("");
    setAb([]);
    setAdvanced(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-black/60 dark:text-white/60">Destination URL</span>
          <input type="url" required placeholder="https://example.com" value={destination} onChange={(e) => setDestination(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 sm:w-40">
          <span className="text-xs text-black/60 dark:text-white/60">Name (optional)</span>
          <input type="text" placeholder="Spring flyer" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 sm:w-48">
          <span className="text-xs text-black/60 dark:text-white/60">Folder</span>
          <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className={inputCls}>
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-black/60 dark:text-white/60">Tags (comma-separated)</span>
          <input type="text" placeholder="print, q2-campaign" value={tagsText} onChange={(e) => setTagsText(e.target.value)} className={inputCls} />
        </label>
        <button type="submit" disabled={loading} className="rounded-md bg-brand hover:bg-brand-hover px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50">
          {loading ? "…" : "Create"}
        </button>
      </div>

      <button type="button" onClick={() => setAdvanced((v) => !v)} className="self-start text-xs text-brand hover:underline">
        {advanced ? "Hide advanced" : "Advanced: scheduling, password, A/B"}
      </button>

      {advanced && (
        <div className="flex flex-col gap-4 rounded-md border border-black/10 p-3 dark:border-white/10">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-black/60 dark:text-white/60">Active from</span>
              <input type="datetime-local" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-black/60 dark:text-white/60">Active until</span>
              <input type="datetime-local" value={activeUntil} onChange={(e) => setActiveUntil(e.target.value)} className={inputCls} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-black/60 dark:text-white/60">Password (optional, min 4 chars)</span>
            <input type="text" placeholder="Leave blank for no password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-black/60 dark:text-white/60">A/B split (overrides destination when ≥2 variants)</span>
            <AbBuilder arms={ab} onChange={setAb} />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
