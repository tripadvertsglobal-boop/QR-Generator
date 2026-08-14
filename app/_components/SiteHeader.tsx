"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/site.config";
import SignOutButton from "@/app/dashboard/SignOutButton";
import { useAuth } from "./AuthProvider";

export default function SiteHeader() {
  const { user } = useAuth();
  const pathname = usePathname();

  // Public scan / password-unlock interstitials (/r/...) are standalone pages
  // for people who scanned a code — they get no app chrome. The /dashboard
  // surface has its own shell (sidebar/drawer), so the marketing header is
  // suppressed there too.
  if (pathname?.startsWith("/r/") || pathname?.startsWith("/dashboard")) return null;

  return (
    <header className="sticky top-0 z-10 border-b-2 border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href={user ? "/dashboard" : "/"}
          className="text-lg font-extrabold tracking-tight text-foreground no-underline"
        >
          {siteConfig.company.name}
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {/* Pricing is pre-sale marketing — hidden once a user is signed in. */}
          {!user && (
            <Link href="/pricing" className="text-muted no-underline hover:text-brand">
              Pricing
            </Link>
          )}
          <Link href="/docs" className="text-muted no-underline hover:text-brand">
            Docs
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-muted no-underline hover:text-brand">
                Dashboard
              </Link>
              <Link
                href="/dashboard/account"
                className="text-muted no-underline hover:text-brand"
              >
                Account
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href={siteConfig.links.logIn}
              className="px-3.5 py-2 font-extrabold no-underline text-[var(--brand-fg)] [background:var(--brand)] hover:[background:var(--brand-hover)]"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
