import Link from "next/link";
import { createUserClient } from "@/lib/supabase/server";
import WebhooksManager from "./WebhooksManager";

export default async function WebhooksPage() {
  const supabase = await createUserClient();
  const { data } = await supabase
    .from("webhooks")
    .select("id, url, events, secret, is_active, failure_count, last_triggered_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-brand underline">
        ← Back to dashboard
      </Link>
      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Receive HMAC-signed POSTs on QR mutations and scan milestones. Verify the{" "}
          <code className="text-xs">X-Webhook-Signature</code> header (sha256 HMAC of the body) with your secret.
        </p>
      </header>
      <WebhooksManager initial={data ?? []} />
    </main>
  );
}
