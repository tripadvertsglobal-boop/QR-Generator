import Link from "next/link";
import { createUserClient } from "@/lib/supabase/server";

type AuditRow = {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip_address: string | null;
  created_at: string;
};

export default async function AuditPage() {
  const supabase = await createUserClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, resource_type, resource_id, ip_address, created_at")
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
              <th className="py-2">Resource</th>
              <th className="py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-black/10 dark:border-white/10">
                <td className="py-2 text-black/60 dark:text-white/60">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="py-2">
                  <code className="text-xs">{r.action}</code>
                </td>
                <td className="py-2 text-black/60 dark:text-white/60">{r.resource_type}</td>
                <td className="py-2 text-black/60 dark:text-white/60">{r.ip_address ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
