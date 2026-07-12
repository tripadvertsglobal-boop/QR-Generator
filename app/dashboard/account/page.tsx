import { createUserClient } from "@/lib/supabase/server";
import PageHeader from "@/app/_components/ui/PageHeader";
import { buttonClasses } from "@/app/_components/ui/Button";
import DeleteAccount from "./DeleteAccount";

export default async function AccountPage() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-8 sm:px-8">
      <PageHeader title="Account" description={user?.email} />

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
