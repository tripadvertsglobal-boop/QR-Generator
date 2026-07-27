import type { MetadataRoute } from "next";

// Keep crawlers out of the app surface and the redirect engine. /r/* in
// particular must not be indexed: each hit is a scan, so a crawl would inflate
// every customer's analytics.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/", "/r/", "/login", "/signup", "/reset-password"],
    },
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
