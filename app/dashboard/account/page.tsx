import Link from "next/link";
import { createUserClient } from "@/lib/supabase/server";
import { limitsFor, type Plan } from "@/lib/plan";
import PageHeader from "@/app/_components/ui/PageHeader";
import Badge from "@/app/_components/ui/Badge";
import { buttonClasses } from "@/app/_components/ui/Button";
import DeleteAccount from "./DeleteAccount";

const PLAN_LABEL: Record<Plan, string> = { free: "Free", pro: "Pro", business: "Business" };

export default async function AccountPage() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS scopes both to the caller.
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("user_profiles").select("plan").maybeSingle(),
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
          {limits.apiAccess ? "API & webhooks enabled" : "API, webhooks, and CSV export are Pro features"}
        </p>
        {plan === "free" && (
          <Link href="/pricing" className={buttonClasses("secondary", "md", "self-start")}>
            See plans
          </Link>
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
