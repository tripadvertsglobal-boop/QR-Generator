"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/_components/ui/Button";
import { Input, Field } from "@/app/_components/ui/Input";
import AbBuilder from "../AbBuilder";
import type { AbDestination } from "../types";

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
    <section className="mt-10 flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-card">
      <h2 className="font-medium">Advanced settings</h2>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Field label="Active from" className="flex-1">
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Active until" className="flex-1">
          <Input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} />
        </Field>
      </div>

      <Field
        label={
          <>
            Password {hasPassword && <span className="font-normal text-emerald-600">(currently set)</span>}
          </>
        }
      >
        <Input
          type="text"
          placeholder={hasPassword ? "Enter a new password to change it" : "Set a password (min 4 chars)"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={clearPassword}
        />
      </Field>
      {hasPassword && (
        <label className="-mt-2 flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={clearPassword} onChange={(e) => setClearPassword(e.target.checked)} className="h-4 w-4 accent-brand" />
          Remove password protection
        </label>
      )}

      <Field label="A/B split (≥2 variants; clear all to disable)">
        <AbBuilder arms={arms} onChange={setArms} />
      </Field>

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={busy} className="self-start">Save settings</Button>
        {msg && <span className="text-sm text-emerald-600">{msg}</span>}
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </div>
    </section>
  );
}
