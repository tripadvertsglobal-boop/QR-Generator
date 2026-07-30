import type { MetadataRoute } from "next";

// Keep crawlers out of the app surface and the redirect engine. /r/* in
// particular must not be indexed: each hit is a scan, so a crawl would inflate
// every customer's analytics.
//
// The auth screens are deliberately NOT listed here. Blocking a path stops it
// being crawled, which means the noindex directive on it is never read and the
// URL can still be indexed from an external link. They carry noindex instead —
// see app/(auth)/layout.tsx.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/", "/r/"],
    },
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
