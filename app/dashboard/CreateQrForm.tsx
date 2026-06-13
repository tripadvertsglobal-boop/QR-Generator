"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateQrForm() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/v1/qrcodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination_url: destination, name }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      return;
    }
    setDestination("");
    setName("");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15 sm:flex-row sm:items-end"
    >
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-xs text-black/60 dark:text-white/60">Destination URL</span>
        <input
          type="url"
          required
          placeholder="https://example.com"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
        />
      </label>
      <label className="flex flex-col gap-1 sm:w-40">
        <span className="text-xs text-black/60 dark:text-white/60">Name (optional)</span>
        <input
          type="text"
          placeholder="Spring flyer"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {loading ? "…" : "Create"}
      </button>
      {error && <p className="text-sm text-red-500 sm:w-full">{error}</p>}
    </form>
  );
}
