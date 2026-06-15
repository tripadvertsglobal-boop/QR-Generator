"use client";

import Link from "next/link";
import { siteConfig } from "@/site.config";
import SignOutButton from "@/app/dashboard/SignOutButton";
import { useAuth } from "./AuthProvider";

export default function SiteHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {siteConfig.company.name}
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/pricing" className="text-black/70 hover:text-black">
            Pricing
          </Link>
          <Link href="/docs" className="text-black/70 hover:text-black">
            Docs
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 font-medium text-[var(--brand-fg)] [background:var(--brand)] hover:[background:var(--brand-hover)]"
              >
                Dashboard
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href={siteConfig.links.logIn} className="text-black/70 hover:text-black">
                Log in
              </Link>
              <Link
                href={siteConfig.links.signUp}
                className="rounded-md px-3 py-1.5 font-medium text-[var(--brand-fg)] [background:var(--brand)] hover:[background:var(--brand-hover)]"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
