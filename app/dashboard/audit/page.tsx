import { createUserClient } from "@/lib/supabase/server";

type Json = Record<string, unknown> | null;

type AuditRow = {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_value: Json;
  new_value: Json;
  ip_address: string | null;
  created_at: string;
};

type Tone = "emerald" | "blue" | "rose" | "gray";

const BADGE: Record<Tone, string> = {
  emerald: "bg-accent-100 text-accent-800",
  blue: "bg-foreground text-background",
  rose: "bg-accent-200 text-accent-800",
  gray: "bg-neutral-200 text-neutral-800",
};
const DOT: Record<Tone, string> = {
  emerald: "bg-brand",
  blue: "bg-background",
  rose: "bg-accent-700",
  gray: "bg-neutral-600",
};

const RESOURCE_LABEL: Record<string, string> = {
  qr_code: "QR code",
  api_key: "API key",
  folder: "Folder",
  webhook: "Webhook",
  user_profile: "Account",
};

// Turn a raw `resource.verb` action into a human badge + tone.
function describeAction(action: string, resourceType: string) {
  const verb = action.split(".").slice(1).join(".") || action;
  const label = RESOURCE_LABEL[resourceType] ?? resourceType.replace(/_/g, " ");
  let text = verb.charAt(0).toUpperCase() + verb.slice(1);
  let tone: Tone = "gray";
  if (verb.includes("bulk_create")) [text, tone] = ["Bulk created", "emerald"];
  else if (verb.includes("bulk_delete")) [text, tone] = ["Bulk deleted", "rose"];
  else if (verb.endsWith("create")) [text, tone] = ["Created", "emerald"];
  else if (verb.endsWith("update")) [text, tone] = ["Updated", "blue"];
  else if (verb.endsWith("delete")) [text, tone] = ["Deleted", "rose"];
  return { text, label, tone };
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "empty";
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "true" : "false";
  return JSON.stringify(v);
}

type ChangeLine = { field: string; before: string | null; after: string; pair: boolean };

// Field-level changes: `before → after` for updates, or a plain snapshot line
// for creates/deletes (which have no counterpart to diff against).
function diffLines(oldValue: Json, newValue: Json): ChangeLine[] | null {
  const keys = [...new Set([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})])];
  if (keys.length === 0) return null;
  const pair = !!(oldValue && newValue);
  return keys.map((k) => ({
    field: k,
    before: pair ? fmtVal(oldValue?.[k]) : null,
    after: fmtVal((newValue ?? oldValue)?.[k]),
    pair,
  }));
}

function dayLabel(d: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default async function AuditPage() {
  const supabase = await createUserClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, resource_type, resource_id, old_value, new_value, ip_address, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as AuditRow[];

  // Rows arrive newest-first; collapse consecutive same-day rows into sections.
  const groups: { label: string; rows: AuditRow[] }[] = [];
  for (const r of rows) {
    const label = dayLabel(new Date(r.created_at));
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(r);
    else groups.push({ label, rows: [r] });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Audit log</h1>
          {rows.length > 0 && (
            <span className="bg-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-800">
              {rows.length}{rows.length === 200 ? "+" : ""} event{rows.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          A record of every change made to your account, by you or via the API. Showing the latest
          200 events; entries are retained for 90 days.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center bg-foreground/[0.06] text-lg">
            🗒️
          </div>
          <p className="text-sm font-medium">No activity yet</p>
          <p className="mt-1 text-sm text-muted-2">
            Actions like creating, editing, or deleting QR codes will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-2">
                {group.label}
              </h2>
              <div className="divide-y divide-border border-2 border-border bg-background">
                {group.rows.map((r) => {
                  const { text, label, tone } = describeAction(r.action, r.resource_type);
                  const changes = diffLines(r.old_value, r.new_value);
                  const when = new Date(r.created_at);
                  return (
                    <div key={r.id} className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[tone]}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold ${BADGE[tone]}`}
                            >
                              {text}
                            </span>
                            <span className="text-sm font-medium">{label}</span>
                            {r.resource_id && (
                              <code className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-muted-2">
                                {r.resource_id.slice(0, 8)}
                              </code>
                            )}
                          </div>
                          <time
                            dateTime={r.created_at}
                            title={when.toLocaleString()}
                            className="shrink-0 whitespace-nowrap pt-0.5 text-xs text-muted-2"
                          >
                            {when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          </time>
                        </div>

                        {changes && (
                          <ul className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed">
                            {changes.map((c, i) => (
                              <li key={i} className="flex flex-wrap items-baseline gap-x-1.5">
                                <span className="text-muted-2">{c.field}</span>
                                {c.pair ? (
                                  <>
                                    <span className="break-all text-muted line-through decoration-border-strong">
                                      {c.before}
                                    </span>
                                    <span className="text-muted-2">→</span>
                                    <span className="break-all font-semibold text-foreground">{c.after}</span>
                                  </>
                                ) : (
                                  <span className="break-all text-muted">{c.after}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}

                        {r.ip_address && (
                          <p className="mt-2 text-[11px] text-muted-2">
                            from <span className="font-mono">{r.ip_address}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
