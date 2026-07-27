import Link from "next/link";
import { createUserClient } from "@/lib/supabase/server";
import { MAX_API_KEYS } from "@/lib/apikey";
import { limitsFor } from "@/lib/plan";
import PageHeader from "@/app/_components/ui/PageHeader";
import UpgradeNotice from "@/app/dashboard/_components/UpgradeNotice";
import KeysManager from "./KeysManager";

export default async function KeysPage() {
  const supabase = await createUserClient();
  // RLS scopes both reads to the caller.
  const [{ data: profile }, { data }] = await Promise.all([
    supabase.from("user_profiles").select("plan").maybeSingle(),
    supabase
      .from("api_keys")
      .select("id, name, key_prefix, scopes, rate_limit, is_active, last_used_at, expires_at, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);
  const limits = limitsFor(profile?.plan);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <PageHeader
        title="API keys"
        description={
          <>
            Authenticate API requests with the{" "}
            <code className="rounded bg-black/[0.05] px-1 py-0.5 font-mono text-xs">X-API-Key</code> header. Keys
            are shown once at creation — store them securely. Up to {MAX_API_KEYS} active keys per account. See the{" "}
            <Link href="/docs" className="text-brand underline">API docs</Link>.
          </>
        }
        className="mb-8"
      />
      {limits.apiAccess ? (
        <KeysManager initial={data ?? []} />
      ) : (
        <UpgradeNotice
          feature="API access"
          description="Mint scoped API keys and call the QR endpoints programmatically. Your existing QR codes and analytics stay available on the Free plan."
        />
      )}
    </main>
  );
}
