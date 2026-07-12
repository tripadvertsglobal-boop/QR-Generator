"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/app/_components/Spinner";
import Button from "@/app/_components/ui/Button";
import { Input, Field } from "@/app/_components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // The recovery link lands here; exchange the ?code= for a session if present.
  useEffect(() => {
    const supabase = createClient();
    const code = new URLSearchParams(window.location.search).get("code");
    (async () => {
      if (code) await supabase.auth.exchangeCodeForSession(code).catch(() => {});
      const { data } = await supabase.auth.getSession();
      setReady(!!data.session);
      if (!data.session) setError("This reset link is invalid or has expired. Request a new one.");
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col justify-center gap-5 px-6 py-10">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">Choose a new password</h1>
        {!ready && !error && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Spinner className="h-4 w-4" /> Verifying reset link…
          </p>
        )}
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="New password" htmlFor="password">
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!ready}
            />
          </Field>
          <Button type="submit" loading={loading} disabled={!ready} className="w-full">
            {loading ? "Updating…" : "Update password"}
          </Button>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>
      </div>
    </div>
  );
}
