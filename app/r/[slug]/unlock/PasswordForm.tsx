"use client";

import { useState } from "react";

export default function PasswordForm({ slug }: { slug: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/r/${slug}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      // Cookie is set; the redirect engine will now resolve the destination.
      window.location.href = `/r/${slug}`;
      return;
    }
    setLoading(false);
    setError(res.status === 401 ? "Incorrect password" : "Something went wrong");
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-xs flex-col gap-4">
      <h1 className="text-lg font-semibold">This link is password protected</h1>
      <input
        type="password"
        autoFocus
        required
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-brand hover:bg-brand-hover px-3 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
      >
        {loading ? "…" : "Unlock"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
