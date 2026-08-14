"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="border border-border px-3 py-1.5 text-sm font-extrabold hover:bg-foreground/[0.07]"
    >
      Sign out
    </button>
  );
}
