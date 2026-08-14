"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/app/_components/ui/Button";
import Badge from "@/app/_components/ui/Badge";
import { Input } from "@/app/_components/ui/Input";
import type { QrCode } from "./types";

const REDIRECT_DOMAIN = process.env.NEXT_PUBLIC_REDIRECT_DOMAIN ?? "";

// Columns declared by QrList's <thead>; the edit strip spans all of them.
const COLUMNS = 8;

// Cell rhythm. The outer columns carry the page gutter so the rules still run
// edge to edge, matching the bands above the table.
const CELL = "px-2 py-2.5";
const FIRST = "py-2.5 pl-5 pr-2 sm:pl-8";
const LAST = "py-2.5 pl-2 pr-5 sm:pr-8";

// Row actions stay quiet — red is the primary action's colour, and a ledger of
// forty rows would be nothing but red if every control claimed it. Delete keeps
// the accent, because it is the one action you cannot take back.
const QUIET = "text-muted hover:bg-foreground/[0.07] hover:text-foreground";

export default function QrRow({
  code,
  folderName,
  selected,
  onSelectChange,
  canArchive,
  layout = "row",
}: {
  code: QrCode;
  folderName?: string;
  selected: boolean;
  onSelectChange: (id: string, checked: boolean) => void;
  canArchive: boolean;
  /** "row" is the desktop ledger; "card" is the stacked view under `md`. */
  layout?: "row" | "card";
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

  async function toggleArchived() {
    // Archiving is Pro-gated; the API 402s. Send Free users to the plans page
    // rather than letting them hit a failure they can't act on.
    if (!canArchive) {
      router.push("/pricing");
      return;
    }
    const archiving = !code.archived_at;
    if (
      archiving &&
      !confirm("Archive this QR code? Printed codes will stop working. You can restore it later.")
    ) {
      return;
    }
    if (await patch({ archived: archiving })) router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this QR code? Printed codes will stop working.")) return;
    setBusy(true);
    const res = await fetch(`/api/v1/qrcodes/${code.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError("Delete failed");
  }

  const slug = (
    <a
      href={`${REDIRECT_DOMAIN}/r/${code.short_slug}`}
      target="_blank"
      rel="noreferrer"
      className="block truncate text-[11.5px] font-extrabold text-accent-700 no-underline hover:underline"
    >
      /r/{code.short_slug}
    </a>
  );

  const states = (
    <>
      {/* Archived wins over active/paused — it's the state that decides
          whether the code resolves. */}
      {code.archived_at ? (
        <Badge tone="amber" dot>
          Archived
        </Badge>
      ) : (
        <Badge tone={code.is_active ? "emerald" : "gray"} dot>
          {code.is_active ? "Active" : "Paused"}
        </Badge>
      )}
      {code.has_password && <Badge tone="gray">Password</Badge>}
      {(code.active_from || code.active_until) && <Badge tone="gray">Scheduled</Badge>}
      {code.ab_destinations && code.ab_destinations.length > 0 && <Badge tone="blue">A/B</Badge>}
    </>
  );

  const chips = (
    <>
      {folderName && (
        <span className="bg-neutral-100 px-2.5 py-0.5 text-[11px] text-neutral-800">
          {folderName}
        </span>
      )}
      {code.tags.map((t) => (
        <span key={t} className="border border-brand px-2 py-0.5 text-[11px] text-brand">
          {t}
        </span>
      ))}
    </>
  );

  const actions = (
    <>
      {/* An archived code is retired: editing and pausing it are meaningless
          until it is restored. */}
      {!code.archived_at && (
        <>
          <Button
            size="sm"
            variant="ghost"
            className={QUIET}
            disabled={busy}
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={QUIET}
            disabled={busy}
            onClick={toggleActive}
          >
            {code.is_active ? "Pause" : "Activate"}
          </Button>
        </>
      )}
      <Button
        size="sm"
        variant="ghost"
        className={QUIET}
        disabled={busy}
        onClick={toggleArchived}
        title={canArchive ? undefined : "Archiving is available on Pro"}
      >
        {code.archived_at ? "Restore" : "Archive"}
        {!canArchive && " ↑"}
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>
        Delete
      </Button>
    </>
  );

  const editForm = (
    <form onSubmit={saveEdit} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-extrabold">{code.name ?? "Untitled"}</span>
        <span className="text-[11.5px] font-extrabold text-accent-700">/r/{code.short_slug}</span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="url"
          required
          aria-label="Destination URL"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="sm:flex-1"
        />
        <Input
          type="text"
          placeholder="Name (optional)"
          aria-label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="sm:w-56"
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
      </div>
      {error && <p className="text-sm font-semibold text-accent-700">{error}</p>}
    </form>
  );

  /* ------------------------------------------------------------------ */
  /* Card — the stacked view under `md`. Same controls, restacked.       */
  /* ------------------------------------------------------------------ */
  if (layout === "card") {
    return (
      <li className="border-b border-border px-5 py-3">
        {editing ? (
          editForm
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => onSelectChange(code.id, e.target.checked)}
                className="h-4 w-4 shrink-0 accent-brand"
                aria-label="Select code"
              />
              <Link
                href={`/dashboard/${code.id}`}
                className="min-w-0 flex-1 truncate font-extrabold text-foreground no-underline"
              >
                {code.name ?? "Untitled"}
              </Link>
              <span className="shrink-0 font-extrabold tabular-nums">
                {code.scan_count.toLocaleString()}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 pl-[26px]">
              <div className="min-w-0 flex-1">{slug}</div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">{states}</div>
            </div>
            <p className="mt-1 truncate pl-[26px] text-[12.5px] text-muted">
              {code.destination_url}
            </p>
            {(folderName || code.tags.length > 0) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-[26px]">{chips}</div>
            )}
            <div className="mt-1.5 flex flex-wrap gap-0.5 pl-[22px]">{actions}</div>
            {error && <p className="mt-1 text-xs font-semibold text-accent-700">{error}</p>}
          </>
        )}
      </li>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Row — the desktop ledger                                            */
  /* ------------------------------------------------------------------ */

  // Editing turns the whole row into a single full-width strip, so the row keeps
  // its identity (name + slug) while the fields are open.
  if (editing) {
    return (
      <tr className="border-b border-border bg-surface">
        <td colSpan={COLUMNS} className="px-5 py-3 sm:px-8">
          {editForm}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border align-middle transition-colors hover:bg-foreground/[0.04]">
      <td className={FIRST}>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelectChange(code.id, e.target.checked)}
          className="h-4 w-4 accent-brand"
          aria-label="Select code"
        />
      </td>
      <td className={CELL}>
        {/* Real render of the tracking URL, straight off the existing endpoint. */}
        <Link
          href={`/dashboard/${code.id}`}
          className="block w-[34px] border border-border bg-white p-0.5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/v1/qrcodes/${code.id}/qr.svg`}
            alt=""
            width={30}
            height={30}
            loading="lazy"
            decoding="async"
            className="block h-[30px] w-[30px]"
          />
        </Link>
      </td>
      <td className={CELL}>
        {/* Truncation lives on an inner box: a td has no definite width to
            ellipsis against under auto table layout. */}
        <div className="max-w-[230px]">
          <Link
            href={`/dashboard/${code.id}`}
            className="block truncate font-extrabold text-foreground no-underline hover:text-brand"
          >
            {code.name ?? "Untitled"}
          </Link>
          {slug}
        </div>
      </td>
      <td className={CELL}>
        <div
          className="max-w-[250px] truncate text-[12.5px] text-muted"
          title={code.destination_url}
        >
          {code.destination_url}
        </div>
      </td>
      <td className={CELL}>
        <div className="flex flex-wrap items-center gap-1.5">{chips}</div>
      </td>
      <td className={`${CELL} text-right font-extrabold tabular-nums`}>
        {code.scan_count.toLocaleString()}
      </td>
      <td className={CELL}>
        <div className="flex flex-wrap gap-1">{states}</div>
      </td>
      <td className={LAST}>
        <div className="flex justify-end gap-0.5">{actions}</div>
        {error && <p className="text-right text-xs font-semibold text-accent-700">{error}</p>}
      </td>
    </tr>
  );
}
