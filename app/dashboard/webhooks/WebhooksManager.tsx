"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/_components/ui/Button";
import Badge from "@/app/_components/ui/Badge";
import { Input, Field } from "@/app/_components/ui/Input";

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

export default function WebhooksManager({ initial }: { initial: Webhook[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    setDeletingId(id);
    await fetch(`/api/v1/webhooks/${id}`, { method: "DELETE" });
    router.refresh();
    setDeletingId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-card">
        <Field label="Endpoint URL">
          <Input type="url" required placeholder="https://your-server.com/webhook" value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium">Events</span>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {EVENTS.map((ev) => (
              <label key={ev} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={events.includes(ev)} onChange={(e) => toggle(ev, e.target.checked)} className="h-4 w-4 accent-brand" />
                <code className="font-mono text-xs text-muted">{ev}</code>
              </label>
            ))}
          </div>
        </div>
        <Button type="submit" className="self-start" loading={busy}>Add webhook</Button>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </form>

      <ul className="flex flex-col gap-3">
        {initial.length === 0 && (
          <li className="rounded-xl border border-dashed border-border bg-black/[0.015] px-6 py-12 text-center text-sm text-muted">
            No webhooks yet.
          </li>
        )}
        {initial.map((wh) => (
          <li key={wh.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <span className="truncate font-medium">{wh.url}</span>
              <Badge tone={wh.is_active ? "emerald" : "rose"} dot>
                {wh.is_active ? "Active" : `Disabled (${wh.failure_count} fails)`}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {wh.events.map((e) => (
                <code key={e} className="rounded-full bg-black/[0.05] px-2 py-0.5 font-mono text-xs text-muted">{e}</code>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>Secret</span>
              <code className="overflow-x-auto rounded bg-black/[0.05] px-1.5 py-0.5 font-mono">{wh.secret}</code>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => remove(wh.id)}
              loading={deletingId === wh.id}
              className="self-start text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
