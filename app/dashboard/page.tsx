import { createUserClient } from "@/lib/supabase/server";
import PageHeader from "@/app/_components/ui/PageHeader";
import CreateQrForm from "./CreateQrForm";
import FolderSidebar from "./FolderSidebar";
import TagFilterBar from "./TagFilterBar";
import QrList from "./QrList";
import type { Folder, QrCode } from "./types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; tag?: string }>;
}) {
  const { folder = null, tag = null } = await searchParams;
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: folderData }, { data: codeData }] = await Promise.all([
    supabase.from("folders").select("id, name, color").order("name"),
    supabase
      .from("qr_codes")
      .select(
        "id, short_slug, destination_url, name, is_active, scan_count, folder_id, tags, active_from, active_until, ab_destinations, password_hash, created_at",
      )
      .order("created_at", { ascending: false }),
  ]);

  const folders = (folderData ?? []) as Folder[];
  // Map to has_password and drop the hash before it reaches client components.
  const allCodes: QrCode[] = (codeData ?? []).map((row) => {
    const { password_hash, ...rest } = row as Record<string, unknown> & { password_hash: string | null };
    return { ...rest, has_password: !!password_hash } as QrCode;
  });

  // Counts for the sidebar (computed from the full set).
  const counts: Record<string, number> = {};
  let unfiled = 0;
  const tagSet = new Set<string>();
  for (const c of allCodes) {
    if (c.folder_id) counts[c.folder_id] = (counts[c.folder_id] ?? 0) + 1;
    else unfiled += 1;
    for (const t of c.tags) tagSet.add(t);
  }

  // Apply the active folder/tag filter for display.
  const visible = allCodes.filter((c) => {
    if (folder === "none" && c.folder_id !== null) return false;
    if (folder && folder !== "none" && c.folder_id !== folder) return false;
    if (tag && !c.tags.includes(tag)) return false;
    return true;
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <PageHeader
        title="QR codes"
        description={`${allCodes.length} ${allCodes.length === 1 ? "code" : "codes"} · ${user?.email ?? ""}`}
        className="mb-8"
      />

      <div className="flex flex-col gap-8 lg:flex-row">
        <FolderSidebar
          folders={folders}
          counts={counts}
          total={allCodes.length}
          unfiled={unfiled}
          activeFolder={folder}
        />

        <div className="flex flex-1 flex-col gap-6">
          <CreateQrForm folders={folders} />
          <TagFilterBar tags={[...tagSet].sort()} activeTag={tag} folder={folder} />
          <QrList codes={visible} />
        </div>
      </div>
    </main>
  );
}
