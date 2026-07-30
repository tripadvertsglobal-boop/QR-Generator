import type { Metadata } from "next";

// Sign-in, sign-up, and password-reset screens have nothing to rank for, and a
// duplicate of the login page in the index only competes with the pages that do.
// noindex rather than a robots.txt block: a disallowed URL is never crawled, so
// the directive would never be read, and the page can still surface from an
// external link. See app/robots.ts, which allows these paths for that reason.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
