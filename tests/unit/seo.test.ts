import { describe, it, expect, beforeAll } from "vitest";
import { guides } from "@/content/guides";
import { siteConfig } from "@/site.config";

// lib/seo.ts and app/sitemap.ts read NEXT_PUBLIC_APP_URL at import time, so it
// has to be set before the first import of either.
const APP_URL = "https://qrbuilderstudio.com";
process.env.NEXT_PUBLIC_APP_URL = APP_URL;

let seo: typeof import("@/lib/seo");
let sitemap: typeof import("@/app/sitemap").default;

beforeAll(async () => {
  seo = await import("@/lib/seo");
  sitemap = (await import("@/app/sitemap")).default;
});

describe("pageMetadata", () => {
  it("sets a canonical for the page's own path, never the homepage", () => {
    const meta = seo.pageMetadata({ title: "Pricing", description: "d", path: "/pricing" });
    expect(meta.alternates?.canonical).toBe("/pricing");
  });

  it("includes the og:image on every page", () => {
    // Regression guard: Next merges metadata shallowly, so a page that sets its
    // own openGraph replaces the root layout's and would otherwise lose the image.
    const meta = seo.pageMetadata({ title: "Guides", description: "d", path: "/guides" });
    expect(meta.openGraph).toMatchObject({ images: [seo.OG_IMAGE], url: "/guides" });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("appends the brand to the social title but leaves the bare title for the template", () => {
    const meta = seo.pageMetadata({ title: "Pricing", description: "d", path: "/pricing" });
    expect(meta.title).toBe("Pricing");
    expect(meta.openGraph?.title).toBe(`Pricing — ${siteConfig.company.name}`);
  });

  it("marks a page noindex only when asked", () => {
    expect(seo.pageMetadata({ title: "t", description: "d", path: "/p" }).robots).toBeUndefined();
    expect(
      seo.pageMetadata({ title: "t", description: "d", path: "/p", index: false }).robots,
    ).toMatchObject({ index: false });
  });

  it("emits article times when given them", () => {
    const meta = seo.pageMetadata({
      title: "t",
      description: "d",
      path: "/guides/x",
      article: { published: "2026-01-01", modified: "2026-02-02" },
    });
    expect(meta.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-01-01",
      modifiedTime: "2026-02-02",
    });
  });
});

describe("structured data", () => {
  it("cross-references the shared Organization by @id", () => {
    const org = seo.organizationSchema();
    expect(org["@id"]).toBe(seo.ORG_ID);
    expect(seo.websiteSchema().publisher).toEqual({ "@id": seo.ORG_ID });
  });

  it("builds absolute URLs, since schema.org rejects relative ones", () => {
    expect(seo.absoluteUrl("/pricing")).toBe(`${APP_URL}/pricing`);
    // The homepage must not come out as "https://host/" with a trailing slash
    // that mismatches the canonical.
    expect(seo.absoluteUrl("/")).toBe(APP_URL);
  });

  it("puts Home first in a breadcrumb trail and numbers positions from 1", () => {
    const crumbs = seo.breadcrumbSchema([
      { name: "Guides", path: "/guides" },
      { name: "A guide", path: "/guides/a" },
    ]);
    expect(crumbs.itemListElement.map((i) => [i.position, i.name])).toEqual([
      [1, "Home"],
      [2, "Guides"],
      [3, "A guide"],
    ]);
  });

  it("wraps nodes in a single @graph", () => {
    const g = seo.graph({ "@type": "A" }, { "@type": "B" });
    expect(g["@context"]).toBe("https://schema.org");
    expect(g["@graph"]).toHaveLength(2);
  });
});

describe("sitemap", () => {
  it("lists every guide", () => {
    const urls = sitemap().map((e) => e.url);
    for (const guide of guides) {
      expect(urls).toContain(`${APP_URL}/guides/${guide.slug}`);
    }
    expect(urls).toContain(`${APP_URL}/guides`);
  });

  it("excludes the app surface and the redirect engine", () => {
    const urls = sitemap().map((e) => e.url).join(" ");
    expect(urls).not.toMatch(/\/dashboard|\/api\/|\/r\/|\/login|\/signup/);
  });

  it("uses fixed dates, not the build time", () => {
    // A sitemap that claims every page changed on every deploy is ignored.
    for (const entry of sitemap()) {
      expect(String(entry.lastModified)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("has no duplicate URLs", () => {
    const urls = sitemap().map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("guide content", () => {
  it("has unique slugs", () => {
    const slugs = guides.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has a URL-safe slug, a title, and a meta description for each guide", () => {
    for (const guide of guides) {
      expect(guide.slug, guide.slug).toMatch(/^[a-z0-9-]+$/);
      expect(guide.title.length, guide.slug).toBeGreaterThan(10);
      // Long enough to be useful, short enough that Google won't truncate it
      // into nonsense.
      expect(guide.description.length, guide.slug).toBeGreaterThan(50);
      expect(guide.description.length, guide.slug).toBeLessThan(300);
    }
  });

  it("opens each guide with prose, not a bare heading", () => {
    for (const guide of guides) {
      expect(guide.body[0]?.type, guide.slug).toBe("p");
    }
  });

  it("keeps dates ISO-formatted and updated no earlier than published", () => {
    for (const guide of guides) {
      expect(guide.published, guide.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(guide.updated, guide.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(guide.updated >= guide.published, guide.slug).toBe(true);
    }
  });
});

describe("landing page FAQ", () => {
  it("has questions and answers for FAQPage structured data", () => {
    expect(siteConfig.faq.length).toBeGreaterThan(2);
    for (const item of siteConfig.faq) {
      expect(item.question.endsWith("?"), item.question).toBe(true);
      expect(item.answer.length, item.question).toBeGreaterThan(40);
    }
  });
});
