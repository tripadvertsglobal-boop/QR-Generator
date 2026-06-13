import { createUserClient } from "@/lib/supabase/server";
import CreateQrForm from "./CreateQrForm";
import SignOutButton from "./SignOutButton";
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
    supabase.from("qr_codes").select("*").order("created_at", { ascending: false }),
  ]);

  const folders = (folderData ?? []) as Folder[];
  const allCodes = (codeData ?? []) as QrCode[];

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
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your QR codes</h1>
          <p className="text-sm text-black/60 dark:text-white/60">{user?.email}</p>
        </div>
        <SignOutButton />
      </header>

      <div className="flex flex-col gap-8 sm:flex-row">
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
