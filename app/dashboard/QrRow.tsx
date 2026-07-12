"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/app/_components/ui/Button";
import Badge from "@/app/_components/ui/Badge";
import { Input } from "@/app/_components/ui/Input";
import type { QrCode } from "./types";

const REDIRECT_DOMAIN = process.env.NEXT_PUBLIC_REDIRECT_DOMAIN ?? "";

export default function QrRow({
  code,
  selected,
  onSelectChange,
}: {
  code: QrCode;
  selected: boolean;
  onSelectChange: (id: string, checked: boolean) => void;
}) {
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
      setError((await res.json().catch(() => ({}))).error ?? "Update failed");
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
    <li className="flex gap-3 rounded-xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-border-strong">
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelectChange(code.id, e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-brand"
        aria-label="Select code"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/${code.id}`}
              className="truncate font-medium transition-colors hover:text-brand"
            >
              {code.name ?? "Untitled"}
            </Link>
            <Badge tone={code.is_active ? "emerald" : "gray"} dot>
              {code.is_active ? "Active" : "Paused"}
            </Badge>
            {code.has_password && <Badge tone="gray">Password</Badge>}
            {(code.active_from || code.active_until) && <Badge tone="gray">Scheduled</Badge>}
            {code.ab_destinations && code.ab_destinations.length > 0 && (
              <Badge tone="blue">A/B</Badge>
            )}
          </div>
          <span className="shrink-0 whitespace-nowrap text-sm font-medium tabular-nums">
            {code.scan_count.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted-2">scans</span>
          </span>
        </div>

        <a
          href={`${REDIRECT_DOMAIN}/r/${code.short_slug}`}
          target="_blank"
          rel="noreferrer"
          className="truncate font-mono text-xs text-brand hover:underline"
        >
          {REDIRECT_DOMAIN}/r/{code.short_slug}
        </a>

        {!editing && (
          <p className="truncate text-sm text-muted">→ {code.destination_url}</p>
        )}

        {code.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {code.tags.map((t) => (
              <span key={t} className="rounded-full bg-black/[0.05] px-2 py-0.5 text-xs text-muted">
                {t}
              </span>
            ))}
          </div>
        )}

        {editing ? (
          <form onSubmit={saveEdit} className="flex flex-col gap-2">
            <Input
              type="url"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={busy}>
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditing(false);
                  setDestination(code.destination_url);
                  setName(code.name ?? "");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2 pt-0.5">
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={toggleActive}>
              {code.is_active ? "Pause" : "Activate"}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={remove} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
              Delete
            </Button>
          </div>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </li>
  );
}
