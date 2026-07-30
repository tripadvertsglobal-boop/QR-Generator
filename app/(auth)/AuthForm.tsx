"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/app/_components/ui/Button";
import { Input, Field } from "@/app/_components/ui/Input";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.55Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.71v2.98A11.5 11.5 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.55 14.67a6.9 6.9 0 0 1 0-4.41V7.28H1.71a11.51 11.51 0 0 0 0 10.37l3.84-2.98Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.24 15.1 0 12 0 7.5 0 3.6 2.58 1.71 6.34l3.84 2.98C6.46 6.78 9 4.75 12 4.75Z"
      />
    </svg>
  );
}

export default function AuthForm({
  mode,
  initialError = null,
}: {
  mode: "login" | "signup";
  /** Server-supplied message, e.g. the OAuth failure bounced back by /auth/callback. */
  initialError?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isLogin = mode === "login";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

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

  // Redirects to Google, then back to /auth/callback — the browser leaves this
  // page on success, so loading is only cleared on error.
  async function onGoogle() {
    setError(null);
    setNotice(null);
    setGoogleLoading(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col justify-center gap-5 px-6 py-10">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">{isLogin ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          {isLogin ? "Log in to manage your QR codes." : "Start creating dynamic, trackable QR codes."}
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={onGoogle}
          loading={googleLoading}
          disabled={loading}
          className="w-full"
        >
          {!googleLoading && <GoogleIcon />}
          Continue with Google
        </Button>
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>
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
          {!isLogin && (
            <Field label="Confirm password" htmlFor="confirm-password">
              <Input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>
          )}
          <Button type="submit" loading={loading} disabled={googleLoading} className="mt-1 w-full">
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
