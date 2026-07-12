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
    <header className="sticky top-0 z-10 border-b border-black/10 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href={user ? "/dashboard" : "/"}
          className="text-lg font-semibold tracking-tight"
        >
          {siteConfig.company.name}
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {/* Pricing is pre-sale marketing — hidden once a user is signed in. */}
          {!user && (
            <Link href="/pricing" className="text-black/70 hover:text-black">
              Pricing
            </Link>
          )}
          <Link href="/docs" className="text-black/70 hover:text-black">
            Docs
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-black/70 hover:text-black">
                Dashboard
              </Link>
              <Link
                href="/dashboard/account"
                className="text-black/70 hover:text-black"
              >
                Account
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href={siteConfig.links.logIn}
              className="rounded-md px-3 py-1.5 font-medium text-[var(--brand-fg)] [background:var(--brand)] hover:[background:var(--brand-hover)]"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
