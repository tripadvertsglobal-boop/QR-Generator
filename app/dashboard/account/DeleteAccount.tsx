"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteAccount() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (confirm !== "DELETE") return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/account", { method: "DELETE" });
    if (!res.ok) {
      setBusy(false);
      setError((await res.json().catch(() => ({}))).error ?? "Failed to delete account");
      return;
    }
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-red-500/30 p-4">
      <h2 className="font-medium text-red-500">Delete account</h2>
      <p className="text-sm text-black/60 dark:text-white/60">
        Permanently deletes your account and all data (QR codes, scans, folders, keys, webhooks).
        This cannot be undone. Type <code className="text-xs">DELETE</code> to confirm.
      </p>
      <input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="DELETE"
        className="w-40 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none dark:border-white/20"
      />
      <button
        onClick={onDelete}
        disabled={busy || confirm !== "DELETE"}
        className="self-start rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {busy ? "…" : "Delete my account"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
