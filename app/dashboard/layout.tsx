import { createUserClient } from "@/lib/supabase/server";
import DashboardShell from "./_components/DashboardShell";

// App shell for the whole /dashboard surface: persistent nav (sidebar on
// desktop, drawer on mobile). The marketing SiteHeader is suppressed here.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <DashboardShell email={user?.email ?? ""}>{children}</DashboardShell>;
}
