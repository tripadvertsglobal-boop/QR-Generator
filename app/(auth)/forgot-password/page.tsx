"use client";

import { useState } from "react";
import Link from "next/link";
import Spinner from "@/app/_components/Spinner";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      {sent ? (
        <p className="text-sm text-green-600">
          If an account exists for {email}, a reset link is on its way. Check your inbox.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand hover:bg-brand-hover px-3 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
          >
            {loading && <Spinner />}
            {loading ? "Sending…" : "Send reset link"}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      )}
      <Link href="/login" className="text-sm text-brand underline">
        Back to log in
      </Link>
    </div>
  );
}
