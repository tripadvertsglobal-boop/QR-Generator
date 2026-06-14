"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

const inputCls =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20";

const MAX_KEYS = 4;

export default function KeysManager({ initial }: { initial: ApiKey[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([...SCOPES]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
    await fetch(`/api/v1/keys/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {newKey && (
        <div className="flex flex-col gap-2 rounded-lg border border-green-500/40 bg-green-500/5 p-4">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Key created — copy it now. You won&apos;t be able to see it again.
          </p>
          <code className="block overflow-x-auto rounded bg-black/5 px-3 py-2 text-xs dark:bg-white/10">
            {newKey}
          </code>
          <button
            onClick={() => navigator.clipboard?.writeText(newKey)}
            className="self-start rounded-md border border-black/15 px-3 py-1.5 text-xs dark:border-white/20"
          >
            Copy
          </button>
        </div>
      )}

      <form onSubmit={create} className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-black/60 dark:text-white/60">Key name</span>
          <input
            type="text"
            required
            maxLength={200}
            placeholder="e.g. Production server"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          {SCOPES.map((scope) => (
            <label key={scope} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={scopes.includes(scope)} onChange={(e) => toggle(scope, e.target.checked)} />
              <code className="text-xs">{scope}</code>
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={busy || atLimit}
          className="self-start rounded-md bg-brand hover:bg-brand-hover px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
        >
          {busy ? "…" : "Create key"}
        </button>
        {atLimit && (
          <p className="text-sm text-black/60 dark:text-white/60">
            You have {MAX_KEYS} active keys (the maximum). Revoke one to create another.
          </p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>

      <ul className="flex flex-col gap-3">
        {initial.length === 0 && <li className="text-sm text-black/60 dark:text-white/60">No API keys yet.</li>}
        {initial.map((k) => (
          <li key={k.id} className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/15">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{k.name}</span>
              <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">{k.key_prefix}…</code>
            </div>
            <div className="flex flex-wrap gap-1">
              {k.scopes.map((s) => (
                <code key={s} className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">{s}</code>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/60 dark:text-white/60">
              <span>{k.rate_limit} req/min</span>
              <span>Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}</span>
              {k.expires_at && <span>Expires: {new Date(k.expires_at).toLocaleDateString()}</span>}
            </div>
            <button onClick={() => revoke(k.id)} className="self-start rounded-md border border-red-500/40 px-3 py-1.5 text-sm text-red-500">
              Revoke
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
