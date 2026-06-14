import Link from "next/link";
import { createUserClient } from "@/lib/supabase/server";
import DeleteAccount from "./DeleteAccount";

export default async function AccountPage() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <div>
        <Link href="/dashboard" className="text-sm text-brand underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Account</h1>
        <p className="text-sm text-black/60 dark:text-white/60">{user?.email}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
        <h2 className="font-medium">Export your data</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          Download a JSON archive of all your data (GDPR data portability).
        </p>
        <a
          href="/api/v1/account/export"
          className="self-start rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/20"
        >
          Download export
        </a>
      </section>

      <DeleteAccount />
    </main>
  );
}
