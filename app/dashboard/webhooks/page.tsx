import { createUserClient } from "@/lib/supabase/server";
import { limitsFor } from "@/lib/plan";
import PageHeader from "@/app/_components/ui/PageHeader";
import UpgradeNotice from "@/app/dashboard/_components/UpgradeNotice";
import WebhooksManager from "./WebhooksManager";

export default async function WebhooksPage() {
  const supabase = await createUserClient();
  // RLS scopes both reads to the caller.
  const [{ data: profile }, { data }] = await Promise.all([
    supabase.from("user_profiles").select("plan").maybeSingle(),
    supabase
      .from("webhooks")
      .select("id, url, events, secret, is_active, failure_count, last_triggered_at")
      .order("created_at", { ascending: false }),
  ]);
  const limits = limitsFor(profile?.plan);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <PageHeader
        title="Webhooks"
        description={
          <>
            Receive HMAC-signed POSTs on QR mutations and scan milestones. Verify the{" "}
            <code className="rounded bg-foreground/[0.06] px-1 py-0.5 font-mono text-xs">X-Webhook-Signature</code>{" "}
            header (sha256 HMAC of the body) with your secret.
          </>
        }
        className="mb-8"
      />
      {limits.apiAccess ? (
        <WebhooksManager initial={data ?? []} />
      ) : (
        <UpgradeNotice
          feature="Webhooks"
          description="Get an HMAC-signed POST to your own server whenever a QR code changes or a scan milestone is crossed."
        />
      )}
    </main>
  );
}
