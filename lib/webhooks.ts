import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const WEBHOOK_EVENTS = [
  "qr.created",
  "qr.updated",
  "qr.deleted",
  "scan.threshold",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

const MAX_FAILURES = 10;
const MILESTONES = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

// Returns the milestone crossed when scan_count moved from prev -> curr, else null.
export function crossedMilestone(prev: number, curr: number): number | null {
  for (const m of MILESTONES) if (prev < m && curr >= m) return m;
  return null;
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
}

type WebhookRow = {
  id: string;
  url: string;
  secret: string;
  failure_count: number;
};

// Direct async dispatch — for callers already inside an `after()` (e.g. the edge
// redirect). Most callers should use `emitEvent` instead.
export async function dispatchEvent(userId: string, event: WebhookEvent, data: unknown): Promise<void> {
  const svc = createServiceClient();
  const { data: hooks } = await svc
    .from("webhooks")
    .select("id, url, secret, failure_count")
    .eq("user_id", userId)
    .eq("is_active", true)
    .contains("events", [event]);

  const body = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

  await Promise.all(
    (hooks ?? []).map(async (hook: WebhookRow) => {
      try {
        const res = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Event": event,
            "X-Webhook-Signature": `sha256=${await sign(hook.secret, body)}`,
          },
          body,
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        await svc
          .from("webhooks")
          .update({ last_triggered_at: new Date().toISOString(), failure_count: 0 })
          .eq("id", hook.id);
      } catch {
        const next = hook.failure_count + 1;
        await svc
          .from("webhooks")
          .update({ failure_count: next, is_active: next < MAX_FAILURES })
          .eq("id", hook.id);
      }
    }),
  );
}

// Fire-and-forget: dispatch happens after the response is sent. Never blocks or
// throws into the caller.
export function emitEvent(userId: string, event: WebhookEvent, data: unknown): void {
  after(async () => {
    try {
      await dispatchEvent(userId, event, data);
    } catch {
      /* ignore */
    }
  });
}
