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
    <div className="flex flex-col gap-3 border-2 border-accent-700 bg-accent-100 p-5">
      <h2 className="text-lg text-accent-800">Delete account</h2>
      <p className="text-sm text-muted">
        Permanently deletes your account and all data (QR codes, scans, folders, keys, webhooks).
        This cannot be undone. Type{" "}
        <code className="bg-accent-200 px-1 py-0.5 font-mono text-xs text-accent-800">DELETE</code> to confirm.
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
      {error && <p className="text-sm font-semibold text-accent-700">{error}</p>}
    </div>
  );
}
