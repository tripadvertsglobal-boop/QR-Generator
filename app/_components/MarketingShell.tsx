import type { CSSProperties } from "react";
import { siteConfig } from "@/site.config";
import { createUserClient } from "@/lib/supabase/server";
import AuthProvider from "./AuthProvider";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

// Brand colors and font from site.config are exposed as CSS variables here so
// every marketing page (and its buttons/accents) updates from one place.
const brandVars = {
  "--brand": siteConfig.theme.brand,
  "--brand-fg": siteConfig.theme.brandForeground,
  "--brand-hover": siteConfig.theme.brandHover,
  fontFamily: siteConfig.theme.fontFamily,
} as CSSProperties;

export default async function MarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthProvider initialUser={user}>
      <div style={brandVars} className="flex min-h-screen flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </AuthProvider>
  );
}
