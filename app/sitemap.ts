import type { MetadataRoute } from "next";
import { guides } from "@/content/guides";

// The public, indexable pages. Everything behind auth and the /r/* redirect
// engine is deliberately absent (see app/robots.ts).
//
// `lastModified` is a hand-set date per route rather than `new Date()`: a
// sitemap that claims every page changed on every build teaches crawlers to
// ignore the field. Bump a date when that page's content actually changes.
const ROUTES = [
  { path: "", priority: 1, lastModified: "2026-07-29" },
  { path: "/pricing", priority: 0.8, lastModified: "2026-08-22" },
  { path: "/docs", priority: 0.8, lastModified: "2026-08-22" },
  { path: "/guides", priority: 0.7, lastModified: "2026-08-22" },
  { path: "/privacy", priority: 0.3, lastModified: "2026-06-17" },
  { path: "/terms", priority: 0.3, lastModified: "2026-06-17" },
  { path: "/cookies", priority: 0.3, lastModified: "2026-06-17" },
  { path: "/acceptable-use", priority: 0.3, lastModified: "2026-06-17" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return [
    ...ROUTES.map(({ path, priority, lastModified }) => ({
      url: `${base}${path}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority,
    })),
    ...guides.map((guide) => ({
      url: `${base}/guides/${guide.slug}`,
      lastModified: guide.updated,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
