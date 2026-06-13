import { createUserClient } from "@/lib/supabase/server";
import CreateQrForm from "./CreateQrForm";
import SignOutButton from "./SignOutButton";
import QrRow, { type QrCode } from "./QrRow";

export default async function DashboardPage() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: codes } = await supabase
    .from("qr_codes")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (codes ?? []) as QrCode[];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your QR codes</h1>
          <p className="text-sm text-black/60 dark:text-white/60">{user?.email}</p>
        </div>
        <SignOutButton />
      </header>

      <CreateQrForm />

      <ul className="mt-8 flex flex-col gap-3">
        {list.length === 0 && (
          <li className="text-sm text-black/60 dark:text-white/60">
            No QR codes yet — create your first one above.
          </li>
        )}
        {list.map((code) => (
          <QrRow key={code.id} code={code} />
        ))}
      </ul>
    </main>
  );
}
