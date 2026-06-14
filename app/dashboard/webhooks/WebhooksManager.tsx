"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EVENTS = ["qr.created", "qr.updated", "qr.deleted", "scan.threshold"] as const;

type Webhook = {
  id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  failure_count: number;
  last_triggered_at: string | null;
};

const inputCls =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20";

export default function WebhooksManager({ initial }: { initial: Webhook[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(ev: string, on: boolean) {
    setEvents((prev) => (on ? [...prev, ev] : prev.filter((e) => e !== ev)));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (events.length === 0) {
      setError("Select at least one event");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/v1/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Failed");
      return;
    }
    setUrl("");
    setEvents([]);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this webhook?")) return;
    await fetch(`/api/v1/webhooks/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-black/60 dark:text-white/60">Endpoint URL</span>
          <input type="url" required placeholder="https://your-server.com/webhook" value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} />
        </label>
        <div className="flex flex-wrap gap-3">
          {EVENTS.map((ev) => (
            <label key={ev} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={events.includes(ev)} onChange={(e) => toggle(ev, e.target.checked)} />
              <code className="text-xs">{ev}</code>
            </label>
          ))}
        </div>
        <button type="submit" disabled={busy} className="self-start rounded-md bg-brand hover:bg-brand-hover px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50">
          {busy ? "…" : "Add webhook"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>

      <ul className="flex flex-col gap-3">
        {initial.length === 0 && <li className="text-sm text-black/60 dark:text-white/60">No webhooks yet.</li>}
        {initial.map((wh) => (
          <li key={wh.id} className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/15">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{wh.url}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${wh.is_active ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600"}`}>
                {wh.is_active ? "active" : `disabled (${wh.failure_count} fails)`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {wh.events.map((e) => (
                <code key={e} className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">{e}</code>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
              <span>Secret:</span>
              <code className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">{wh.secret}</code>
            </div>
            <button onClick={() => remove(wh.id)} className="self-start rounded-md border border-red-500/40 px-3 py-1.5 text-sm text-red-500">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
