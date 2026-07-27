import { createUserClient } from "@/lib/supabase/server";
import { limitsFor } from "@/lib/plan";
import PageHeader from "@/app/_components/ui/PageHeader";
import CreateQrForm from "./CreateQrForm";
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

  const [{ data: folderData }, { data: codeData }, { data: profile }] = await Promise.all([
    supabase.from("folders").select("id, name, color").order("name"),
    supabase
      .from("qr_codes")
      .select(
        "id, short_slug, destination_url, name, is_active, scan_count, folder_id, tags, active_from, active_until, ab_destinations, password_hash, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("user_profiles").select("plan").maybeSingle(),
  ]);

  const limits = limitsFor(profile?.plan);
  const folders = (folderData ?? []) as Folder[];
  // Map to has_password and drop the hash before it reaches client components.
  const allCodes: QrCode[] = (codeData ?? []).map((row) => {
    const { password_hash, ...rest } = row as Record<string, unknown> & { password_hash: string | null };
    return { ...rest, has_password: !!password_hash } as QrCode;
  });

  // Collect the tag set for the filter bar (folder counts now live in the shell).
  const tagSet = new Set<string>();
  for (const c of allCodes) {
    for (const t of c.tags) tagSet.add(t);
  }

  // Apply the active folder/tag filter for display.
  const visible = allCodes.filter((c) => {
    if (folder === "none" && c.folder_id !== null) return false;
    if (folder && folder !== "none" && c.folder_id !== folder) return false;
    if (tag && !c.tags.includes(tag)) return false;
    return true;
  });

  // On a capped plan, show usage against the cap so the limit is visible before
  // a create is rejected with 402.
  const usage =
    limits.maxQrCodes === Infinity
      ? `${allCodes.length} ${allCodes.length === 1 ? "code" : "codes"}`
      : `${allCodes.length} of ${limits.maxQrCodes} codes`;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <PageHeader
        title="QR codes"
        description={`${usage} · ${user?.email ?? ""}`}
        className="mb-8"
      />

      <div className="flex flex-col gap-6">
        <CreateQrForm folders={folders} />
        <TagFilterBar tags={[...tagSet].sort()} activeTag={tag} folder={folder} />
        <QrList codes={visible} canExport={limits.bulkOperations} />
      </div>
    </main>
  );
}
