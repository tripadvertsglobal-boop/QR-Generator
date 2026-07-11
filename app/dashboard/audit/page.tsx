import Link from "next/link";
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

// Render the captured change as compact `field: old → new` lines. Falls back to
// a plain snapshot (create/delete) when there's no before/after pair.
function summarizeChange(oldValue: Json, newValue: Json) {
  const keys = [...new Set([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})])];
  if (keys.length === 0) return null;
  const fmt = (v: unknown) => (v === null || v === undefined ? "∅" : JSON.stringify(v));
  const hasPair = oldValue && newValue;
  return keys.map((k) =>
    hasPair
      ? `${k}: ${fmt(oldValue?.[k])} → ${fmt(newValue?.[k])}`
      : `${k}: ${fmt((newValue ?? oldValue)?.[k])}`,
  );
}

export default async function AuditPage() {
  const supabase = await createUserClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, resource_type, resource_id, old_value, new_value, ip_address, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as AuditRow[];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-brand underline">
        ← Back to dashboard
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Your account’s recent activity (last 200 events; retained 90 days).
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">No activity yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
            <tr>
              <th className="py-2">When</th>
              <th className="py-2">Action</th>
              <th className="py-2">Changes</th>
              <th className="py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const changes = summarizeChange(r.old_value, r.new_value);
              return (
                <tr key={r.id} className="border-t border-black/10 dark:border-white/10 align-top">
                  <td className="py-2 text-black/60 dark:text-white/60 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="py-2">
                    <code className="text-xs">{r.action}</code>
                  </td>
                  <td className="py-2 text-black/60 dark:text-white/60">
                    {changes ? (
                      <ul className="space-y-0.5">
                        {changes.map((line, i) => (
                          <li key={i}>
                            <code className="text-xs break-all">{line}</code>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-black/40 dark:text-white/40">{r.resource_type}</span>
                    )}
                  </td>
                  <td className="py-2 text-black/60 dark:text-white/60 whitespace-nowrap">{r.ip_address ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
