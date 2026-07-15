import { createUserClient } from "@/lib/supabase/server";
import DashboardShell from "./_components/DashboardShell";
import type { Folder } from "./types";

// App shell for the whole /dashboard surface: persistent nav (sidebar on
// desktop, drawer on mobile). The marketing SiteHeader is suppressed here.
// Folders + code counts are fetched here so the "QR codes" nav submenu is
// available across every dashboard page, not just the codes list.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createUserClient();
  const [{ data: userData }, { data: folderData }, { data: codeRows }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("folders").select("id, name, color").order("name"),
    supabase.from("qr_codes").select("folder_id"),
  ]);

  const folders = (folderData ?? []) as Folder[];
  const counts: Record<string, number> = {};
  let unfiled = 0;
  for (const row of codeRows ?? []) {
    const fid = (row as { folder_id: string | null }).folder_id;
    if (fid) counts[fid] = (counts[fid] ?? 0) + 1;
    else unfiled += 1;
  }
  const total = (codeRows ?? []).length;

  return (
    <DashboardShell
      email={userData.user?.email ?? ""}
      folders={folders}
      counts={counts}
      total={total}
      unfiled={unfiled}
    >
      {children}
    </DashboardShell>
  );
}
