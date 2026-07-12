"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/_components/ui/Button";
import { Input } from "@/app/_components/ui/Input";
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
    <div className="flex flex-col gap-3 rounded-xl border border-rose-300 bg-rose-50/40 p-5">
      <h2 className="font-medium text-rose-700">Delete account</h2>
      <p className="text-sm text-muted">
        Permanently deletes your account and all data (QR codes, scans, folders, keys, webhooks).
        This cannot be undone. Type{" "}
        <code className="rounded bg-rose-100 px-1 py-0.5 font-mono text-xs text-rose-700">DELETE</code> to confirm.
      </p>
      <Input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="DELETE"
        className="w-40"
      />
      <Button
        variant="danger"
        onClick={onDelete}
        disabled={confirm !== "DELETE"}
        loading={busy}
        className="self-start"
      >
        {busy ? "Deleting…" : "Delete my account"}
      </Button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
