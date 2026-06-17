import type { CSSProperties } from "react";
import { siteConfig } from "@/site.config";
import SiteFooter from "./SiteFooter";

// Brand colors and font from site.config are exposed as CSS variables here so
// every marketing page (and its buttons/accents) updates from one place. The
// header and auth state are provided globally by the root layout.
const brandVars = {
  "--brand": siteConfig.theme.brand,
  "--brand-fg": siteConfig.theme.brandForeground,
  "--brand-hover": siteConfig.theme.brandHover,
  fontFamily: siteConfig.theme.fontFamily,
} as CSSProperties;

export default function MarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={brandVars} className="flex flex-1 flex-col bg-background text-foreground">
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
