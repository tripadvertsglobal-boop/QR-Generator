"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/app/_components/ui/Button";
import { Input, Field } from "@/app/_components/ui/Input";
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
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col justify-center gap-5 px-6 py-10">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          We&apos;ll email you a link to set a new password.
        </p>
        {sent ? (
          <p className="rounded-lg border border-emerald-600/25 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            If an account exists for {email}, a reset link is on its way. Check your inbox.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Button type="submit" loading={loading} className="w-full">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
            {error && <p className="text-sm text-rose-600">{error}</p>}
          </form>
        )}
      </div>
      <Link href="/login" className="text-center text-sm font-medium text-brand hover:underline">
        Back to log in
      </Link>
    </div>
  );
}
