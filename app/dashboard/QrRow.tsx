"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const REDIRECT_DOMAIN = process.env.NEXT_PUBLIC_REDIRECT_DOMAIN ?? "";

export type QrCode = {
  id: string;
  short_slug: string;
  destination_url: string;
  name: string | null;
  is_active: boolean;
  scan_count: number;
  created_at: string;
};

export default function QrRow({ code }: { code: QrCode }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [destination, setDestination] = useState(code.destination_url);
  const [name, setName] = useState(code.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/qrcodes/${code.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Update failed");
      return false;
    }
    return true;
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (await patch({ destination_url: destination, name: name.trim() || null })) {
      setEditing(false);
      router.refresh();
    }
  }

  async function toggleActive() {
    if (await patch({ is_active: !code.is_active })) router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this QR code? Printed codes will stop working.")) return;
    setBusy(true);
    const res = await fetch(`/api/v1/qrcodes/${code.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError("Delete failed");
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/dashboard/${code.id}`} className="font-medium hover:underline">
          {code.name ?? "Untitled"}
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-black/60 dark:text-white/60">{code.scan_count} scans</span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              code.is_active
                ? "bg-green-500/15 text-green-600"
                : "bg-black/10 text-black/50 dark:bg-white/10 dark:text-white/50"
            }`}
          >
            {code.is_active ? "active" : "paused"}
          </span>
        </div>
      </div>

      <a
        href={`${REDIRECT_DOMAIN}/r/${code.short_slug}`}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-blue-600 underline"
      >
        {REDIRECT_DOMAIN}/r/{code.short_slug}
      </a>

      {editing ? (
        <form onSubmit={saveEdit} className="flex flex-col gap-2">
          <input
            type="url"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20"
          />
          <input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDestination(code.destination_url);
                setName(code.name ?? "");
              }}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <span className="truncate text-sm text-black/60 dark:text-white/60">
            → {code.destination_url}
          </span>
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setEditing(true)}
              disabled={busy}
              className="rounded-md border border-black/15 px-3 py-1.5 disabled:opacity-50 dark:border-white/20"
            >
              Edit
            </button>
            <button
              onClick={toggleActive}
              disabled={busy}
              className="rounded-md border border-black/15 px-3 py-1.5 disabled:opacity-50 dark:border-white/20"
            >
              {code.is_active ? "Pause" : "Activate"}
            </button>
            <button
              onClick={remove}
              disabled={busy}
              className="rounded-md border border-red-500/40 px-3 py-1.5 text-red-500 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </li>
  );
}
