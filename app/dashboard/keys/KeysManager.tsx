"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/_components/ui/Button";
import { Input, Field } from "@/app/_components/ui/Input";

const SCOPES = ["qrcodes:read", "qrcodes:write"] as const;

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

const MAX_KEYS = 4;

export default function KeysManager({ initial }: { initial: ApiKey[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([...SCOPES]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  const atLimit = initial.length >= MAX_KEYS;

  function toggle(scope: string, on: boolean) {
    setScopes((prev) => (on ? [...prev, scope] : prev.filter((s) => s !== scope)));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNewKey(null);
    if (scopes.length === 0) {
      setError("Select at least one scope");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/v1/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, scopes }),
    });
    setBusy(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Failed to create key");
      return;
    }
    setNewKey(body.key);
    setName("");
    setScopes([...SCOPES]);
    router.refresh();
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? Requests using it will immediately stop working.")) return;
    setRevokingId(id);
    await fetch(`/api/v1/keys/${id}`, { method: "DELETE" });
    router.refresh();
    setRevokingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {newKey && (
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-600/25 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            Key created — copy it now. You won&apos;t be able to see it again.
          </p>
          <code className="block overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-xs ring-1 ring-emerald-600/20">
            {newKey}
          </code>
          <Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(newKey)} className="self-start">
            Copy
          </Button>
        </div>
      )}

      <form onSubmit={create} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-card">
        <Field label="Key name">
          <Input
            type="text"
            required
            maxLength={200}
            placeholder="e.g. Production server"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium">Scopes</span>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {SCOPES.map((scope) => (
              <label key={scope} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={scopes.includes(scope)} onChange={(e) => toggle(scope, e.target.checked)} className="h-4 w-4 accent-brand" />
                <code className="font-mono text-xs text-muted">{scope}</code>
              </label>
            ))}
          </div>
        </div>
        <Button type="submit" className="self-start" disabled={atLimit} loading={busy}>
          Create key
        </Button>
        {atLimit && (
          <p className="text-sm text-muted">
            You have {MAX_KEYS} active keys (the maximum). Revoke one to create another.
          </p>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </form>

      <ul className="flex flex-col gap-3">
        {initial.length === 0 && (
          <li className="rounded-xl border border-dashed border-border bg-black/[0.015] px-6 py-12 text-center text-sm text-muted">
            No API keys yet.
          </li>
        )}
        {initial.map((k) => (
          <li key={k.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{k.name}</span>
              <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-xs text-muted">{k.key_prefix}…</code>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {k.scopes.map((s) => (
                <code key={s} className="rounded-full bg-black/[0.05] px-2 py-0.5 font-mono text-xs text-muted">{s}</code>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span>{k.rate_limit} req/min</span>
              <span>Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}</span>
              {k.expires_at && <span>Expires: {new Date(k.expires_at).toLocaleDateString()}</span>}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => revoke(k.id)}
              loading={revokingId === k.id}
              className="self-start text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              Revoke
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
