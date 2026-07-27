import type { MetadataRoute } from "next";

// The public, indexable pages. Everything behind auth and the /r/* redirect
// engine is deliberately absent (see app/robots.ts).
const ROUTES = [
  { path: "", priority: 1 },
  { path: "/pricing", priority: 0.8 },
  { path: "/docs", priority: 0.8 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
  { path: "/cookies", priority: 0.3 },
  { path: "/acceptable-use", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const lastModified = new Date();
  return ROUTES.map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority,
  }));
}
