import { createUserClient } from "@/lib/supabase/server";
import CreateQrForm from "./CreateQrForm";
import SignOutButton from "./SignOutButton";

const REDIRECT_DOMAIN = process.env.NEXT_PUBLIC_REDIRECT_DOMAIN ?? "";

type QrCode = {
  id: string;
  short_slug: string;
  destination_url: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
};

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
          <li
            key={code.id}
            className="flex flex-col gap-1 rounded-lg border border-black/10 p-4 dark:border-white/15"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{code.name ?? "Untitled"}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  code.is_active
                    ? "bg-green-500/15 text-green-600"
                    : "bg-black/10 text-black/50 dark:bg-white/10 dark:text-white/50"
                }`}
              >
                {code.is_active ? "active" : "paused"}
              </span>
            </div>
            <a
              href={`${REDIRECT_DOMAIN}/r/${code.short_slug}`}
              className="text-sm text-blue-600 underline"
              target="_blank"
              rel="noreferrer"
            >
              {REDIRECT_DOMAIN}/r/{code.short_slug}
            </a>
            <span className="truncate text-sm text-black/60 dark:text-white/60">
              → {code.destination_url}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
