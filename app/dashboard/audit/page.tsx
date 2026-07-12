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
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
  gray: "bg-black/[0.06] text-black/60 ring-black/10",
};
const DOT: Record<Tone, string> = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  rose: "bg-rose-500",
  gray: "bg-black/30",
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
            <span className="rounded-full bg-black/[0.06] px-2.5 py-0.5 text-xs font-medium text-black/60">
              {rows.length}{rows.length === 200 ? "+" : ""} event{rows.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-black/60">
          A record of every change made to your account, by you or via the API. Showing the latest
          200 events; entries are retained for 90 days.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-black/10 bg-black/[0.015] px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.06] text-lg">
            🗒️
          </div>
          <p className="text-sm font-medium">No activity yet</p>
          <p className="mt-1 text-sm text-black/50">
            Actions like creating, editing, or deleting QR codes will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/40">
                {group.label}
              </h2>
              <div className="divide-y divide-black/[0.07] overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
                {group.rows.map((r) => {
                  const { text, label, tone } = describeAction(r.action, r.resource_type);
                  const changes = diffLines(r.old_value, r.new_value);
                  const when = new Date(r.created_at);
                  return (
                    <div key={r.id} className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-black/[0.02]">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[tone]}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${BADGE[tone]}`}
                            >
                              {text}
                            </span>
                            <span className="text-sm font-medium">{label}</span>
                            {r.resource_id && (
                              <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-black/50">
                                {r.resource_id.slice(0, 8)}
                              </code>
                            )}
                          </div>
                          <time
                            dateTime={r.created_at}
                            title={when.toLocaleString()}
                            className="shrink-0 whitespace-nowrap pt-0.5 text-xs text-black/45"
                          >
                            {when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          </time>
                        </div>

                        {changes && (
                          <ul className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed">
                            {changes.map((c, i) => (
                              <li key={i} className="flex flex-wrap items-baseline gap-x-1.5">
                                <span className="text-black/45">{c.field}</span>
                                {c.pair ? (
                                  <>
                                    <span className="break-all text-rose-600 line-through decoration-rose-300">
                                      {c.before}
                                    </span>
                                    <span className="text-black/30">→</span>
                                    <span className="break-all text-emerald-600">{c.after}</span>
                                  </>
                                ) : (
                                  <span className="break-all text-black/70">{c.after}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}

                        {r.ip_address && (
                          <p className="mt-2 text-[11px] text-black/40">
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
