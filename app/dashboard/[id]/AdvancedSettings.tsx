"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AbBuilder from "../AbBuilder";
import type { AbDestination } from "../types";

const inputCls =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdvancedSettings({
  id,
  activeFrom,
  activeUntil,
  hasPassword,
  ab,
}: {
  id: string;
  activeFrom: string | null;
  activeUntil: string | null;
  hasPassword: boolean;
  ab: AbDestination[] | null;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(toLocalInput(activeFrom));
  const [until, setUntil] = useState(toLocalInput(activeUntil));
  const [newPassword, setNewPassword] = useState("");
  const [clearPassword, setClearPassword] = useState(false);
  const [arms, setArms] = useState<AbDestination[]>(ab ?? []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    setError(null);

    const body: Record<string, unknown> = {
      active_from: from ? new Date(from).toISOString() : null,
      active_until: until ? new Date(until).toISOString() : null,
    };
    if (newPassword) body.password = newPassword;
    else if (clearPassword) body.password = null;

    const validArms = arms.filter((a) => a.url.trim());
    if (validArms.length >= 2) body.ab_destinations = validArms;
    else if (arms.length === 0) body.ab_destinations = null;

    const res = await fetch(`/api/v1/qrcodes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Save failed");
      return;
    }
    setNewPassword("");
    setClearPassword(false);
    setMsg("Saved");
    router.refresh();
  }

  return (
    <section className="mt-10 flex flex-col gap-4 rounded-lg border border-black/10 p-4 dark:border-white/15">
      <h2 className="text-sm font-medium text-black/60 dark:text-white/60">Advanced settings</h2>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-black/60 dark:text-white/60">Active from</span>
          <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-black/60 dark:text-white/60">Active until</span>
          <input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className={inputCls} />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-black/60 dark:text-white/60">
          Password {hasPassword && <span className="text-green-600">(currently set)</span>}
        </span>
        <input
          type="text"
          placeholder={hasPassword ? "Enter a new password to change it" : "Set a password (min 4 chars)"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={clearPassword}
          className={inputCls}
        />
        {hasPassword && (
          <label className="mt-1 flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
            <input type="checkbox" checked={clearPassword} onChange={(e) => setClearPassword(e.target.checked)} />
            Remove password protection
          </label>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-black/60 dark:text-white/60">
          A/B split (≥2 variants; clear all to disable)
        </span>
        <AbBuilder arms={arms} onChange={setArms} />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy ? "…" : "Save settings"}
        </button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </section>
  );
}
