"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { siteConfig } from "@/site.config";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type NavItem = { href: string; label: string; icon: Icon; exact?: boolean };

const SECTION_PREFIXES = ["/dashboard/keys", "/dashboard/webhooks", "/dashboard/audit", "/dashboard/account"];

const NAV: NavItem[] = [
  { href: "/dashboard", label: "QR codes", icon: CodesIcon, exact: true },
  { href: "/dashboard/keys", label: "API keys", icon: KeyIcon },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: WebhookIcon },
  { href: "/dashboard/audit", label: "Audit log", icon: AuditIcon },
  { href: "/dashboard/account", label: "Account", icon: AccountIcon },
];

function useActive() {
  const pathname = usePathname() ?? "";
  return (item: NavItem) => {
    if (item.exact) {
      // "QR codes" also owns the code-detail pages (/dashboard/<id>).
      if (pathname === "/dashboard") return true;
      return pathname.startsWith("/dashboard/") && !SECTION_PREFIXES.some((p) => pathname.startsWith(p));
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };
}

export default function DashboardShell({ email, children }: { email: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const isActive = useActive();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const nav = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-tint text-brand"
                : "text-muted hover:bg-black/[0.04] hover:text-foreground",
            )}
          >
            <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand" : "text-muted-2")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
      <Link
        href="/docs"
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-foreground"
      >
        <DocsIcon className="h-[18px] w-[18px] shrink-0 text-muted-2" />
        Docs
      </Link>
      <button
        onClick={signOut}
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-foreground"
      >
        <SignOutIcon className="h-[18px] w-[18px] shrink-0 text-muted-2" />
        Sign out
      </button>
      {email && <p className="truncate px-3 pt-1 text-xs text-muted-2" title={email}>{email}</p>}
    </div>
  );

  return (
    <div>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface px-3 py-4 lg:flex">
        <Link href="/dashboard" className="mb-4 px-3 text-lg font-semibold tracking-tight">
          {siteConfig.company.name}
        </Link>
        {nav()}
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-surface/85 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          {siteConfig.company.name}
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="-mr-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-black/[0.05] hover:text-foreground"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-surface px-3 py-4 shadow-pop">
            <div className="mb-4 flex items-center justify-between px-3">
              <span className="text-lg font-semibold tracking-tight">{siteConfig.company.name}</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-black/[0.05] hover:text-foreground"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            {nav(() => setOpen(false))}
            {footer}
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="lg:pl-60">{children}</div>
    </div>
  );
}

/* Inline line icons — stroke inherits currentColor, sized by the caller. */
function base(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}
function CodesIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3M20 20v.01M20 14v.01M14 20v.01" />
    </svg>
  );
}
function KeyIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <circle cx="7.5" cy="15.5" r="3.5" />
      <path d="m10 13 8-8M15 5l2 2M18 8l2-2" />
    </svg>
  );
}
function WebhookIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <path d="M12 8a3 3 0 1 0-1.5 2.6L8 16a3 3 0 1 0 2 .5" />
      <path d="M12 8a3 3 0 0 1 5.6 1.4L20 15" />
      <path d="M8 16h6a3 3 0 1 1-.4 4" />
    </svg>
  );
}
function AuditIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <path d="M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5M8 13h8M8 17h5" />
    </svg>
  );
}
function AccountIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}
function DocsIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <path d="M4 5a1 1 0 0 1 1-1h6v16H5a1 1 0 0 1-1-1V5Z" />
      <path d="M11 4h4a1 1 0 0 1 1 1v13M18 8h2M18 12h2" />
    </svg>
  );
}
function SignOutIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <path d="M9 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3" />
      <path d="M16 16l4-4-4-4M20 12H10" />
    </svg>
  );
}
function MenuIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
function CloseIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
