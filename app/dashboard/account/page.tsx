import Link from "next/link";
import { createUserClient } from "@/lib/supabase/server";
import { limitsFor, type Plan } from "@/lib/plan";
import PageHeader from "@/app/_components/ui/PageHeader";
import Badge from "@/app/_components/ui/Badge";
import { buttonClasses } from "@/app/_components/ui/Button";
import DeleteAccount from "./DeleteAccount";
import ManageBilling from "./ManageBilling";

const PLAN_LABEL: Record<Plan, string> = { free: "Free", pro: "Pro", business: "Business" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  // Stripe Checkout sends the customer back here with ?checkout=success.
  const { checkout } = await searchParams;
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS scopes both to the caller.
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("user_profiles").select("plan, stripe_customer_id").maybeSingle(),
    supabase.from("qr_codes").select("id", { count: "exact", head: true }),
  ]);

  const plan = (profile?.plan ?? "free") as Plan;
  const limits = limitsFor(plan);
  const used = count ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-8 sm:px-8">
      <PageHeader title="Account" description={user?.email} />

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">Plan</h2>
          <Badge tone={plan === "free" ? "gray" : "brand"}>{PLAN_LABEL[plan]}</Badge>
        </div>
        <p className="text-sm text-muted">
          {limits.maxQrCodes === Infinity
            ? `${used} QR ${used === 1 ? "code" : "codes"} · unlimited`
            : `${used} of ${limits.maxQrCodes} QR codes used`}
          {" · "}
          {limits.apiAccess
            ? "API & webhooks enabled"
            : "API, webhooks, CSV export, and archiving are Pro features"}
        </p>
        {/* The plan above is written by the Stripe webhook, which can land a
            moment after the browser gets back from Checkout. Saying so beats
            showing a stale "Free" badge with no explanation. */}
        {checkout === "success" && (
          <p className="rounded-lg border border-border bg-black/[0.02] p-3 text-sm">
            Payment received. If your plan still shows as Free, reload in a few seconds — we
            are waiting on confirmation from Stripe.
          </p>
        )}
        {profile?.stripe_customer_id ? (
          <ManageBilling />
        ) : plan === "free" ? (
          <Link href="/pricing" className={buttonClasses("secondary", "md", "self-start")}>
            See plans
          </Link>
        ) : (
          // Paid plan with no Stripe customer: granted by hand. Sending them to
          // /pricing would invite a checkout that attaches a customer id and
          // hands the plan back to Stripe's control.
          <p className="text-sm text-muted">
            This plan is managed for you — contact support to change it.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-card">
        <h2 className="font-medium">Export your data</h2>
        <p className="text-sm text-muted">
          Download a JSON archive of all your data (GDPR data portability).
        </p>
        <a href="/api/v1/account/export" className={buttonClasses("secondary", "md", "self-start")}>
          Download export
        </a>
      </section>

      <DeleteAccount />
    </main>
  );
}
