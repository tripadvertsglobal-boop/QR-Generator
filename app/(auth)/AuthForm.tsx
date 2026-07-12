"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/app/_components/ui/Button";
import { Input, Field } from "@/app/_components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const supabase = createClient();

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setNotice("Check your email to confirm your account, then log in.");
        setLoading(false);
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col justify-center gap-5 px-6 py-10">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">{isLogin ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          {isLogin ? "Log in to manage your QR codes." : "Start creating dynamic, trackable QR codes."}
        </p>
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
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" loading={loading} className="mt-1 w-full">
            {isLogin ? "Log in" : "Sign up"}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        {notice && <p className="mt-3 text-sm text-emerald-600">{notice}</p>}
      </div>
      <p className="text-center text-sm text-muted">
        {isLogin ? (
          <>
            No account?{" "}
            <Link href="/signup" className="font-medium text-brand hover:underline">
              Sign up
            </Link>
            {" · "}
            <Link href="/forgot-password" className="font-medium text-brand hover:underline">
              Forgot password?
            </Link>
          </>
        ) : (
          <>
            Have an account?{" "}
            <Link href="/login" className="font-medium text-brand hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
