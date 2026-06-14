import Link from "next/link";
import { createUserClient } from "@/lib/supabase/server";
import { MAX_API_KEYS } from "@/lib/apikey";
import KeysManager from "./KeysManager";

export default async function KeysPage() {
  const supabase = await createUserClient();
  const { data } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, scopes, rate_limit, is_active, last_used_at, expires_at, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-brand underline">
        ← Back to dashboard
      </Link>
      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold">API keys</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Authenticate API requests with the <code className="text-xs">X-API-Key</code> header. Keys are shown
          once at creation — store them securely. Up to {MAX_API_KEYS} active keys per account. See the{" "}
          <Link href="/docs" className="underline">API docs</Link>.
        </p>
      </header>
      <KeysManager initial={data ?? []} />
    </main>
  );
}
