import { createUserClient } from "@/lib/supabase/server";
import PageHeader from "@/app/_components/ui/PageHeader";
import WebhooksManager from "./WebhooksManager";

export default async function WebhooksPage() {
  const supabase = await createUserClient();
  const { data } = await supabase
    .from("webhooks")
    .select("id, url, events, secret, is_active, failure_count, last_triggered_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <PageHeader
        title="Webhooks"
        description={
          <>
            Receive HMAC-signed POSTs on QR mutations and scan milestones. Verify the{" "}
            <code className="rounded bg-black/[0.05] px-1 py-0.5 font-mono text-xs">X-Webhook-Signature</code>{" "}
            header (sha256 HMAC of the body) with your secret.
          </>
        }
        className="mb-8"
      />
      <WebhooksManager initial={data ?? []} />
    </main>
  );
}
