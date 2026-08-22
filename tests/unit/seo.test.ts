import { describe, it, expect, beforeAll } from "vitest";
import type { Metadata } from "next";
import { guides } from "@/content/guides";
import { siteConfig } from "@/site.config";

// lib/seo.ts and app/sitemap.ts read NEXT_PUBLIC_APP_URL at import time, so it
// has to be set before the first import of either.
const APP_URL = "https://qrbuilderstudio.com";
process.env.NEXT_PUBLIC_APP_URL = APP_URL;

let seo: typeof import("@/lib/seo");
let sitemap: typeof import("@/app/sitemap").default;
// Path → the metadata that page actually exports. Imported dynamically for the
// same reason as above: these modules pull in lib/seo.
let pageMeta: { path: string; metadata: Metadata }[];

beforeAll(async () => {
  seo = await import("@/lib/seo");
  sitemap = (await import("@/app/sitemap")).default;
  pageMeta = [
    { path: "/", metadata: (await import("@/app/page")).metadata },
    { path: "/pricing", metadata: (await import("@/app/pricing/page")).metadata },
    { path: "/docs", metadata: (await import("@/app/docs/page")).metadata },
    { path: "/guides", metadata: (await import("@/app/guides/page")).metadata },
  ];
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

// Snippet length is the one SEO lever that shows up directly in the search
// result. Under ~120 characters wastes the space; over ~155 Google truncates
// the tail or rewrites the description itself, so the words chosen here stop
// being the words shown.
describe("marketing page meta descriptions", () => {
  it("keeps every description in the 120–155 character band", () => {
    for (const { path, metadata } of pageMeta) {
      expect(typeof metadata.description, path).toBe("string");
      expect(metadata.description!.length, path).toBeGreaterThanOrEqual(120);
      expect(metadata.description!.length, path).toBeLessThanOrEqual(155);
    }
  });

  it("never reuses a title or description between two pages", () => {
    // Two pages competing on the same snippet is a signal to consolidate them,
    // not something to leave for Google to pick between.
    const descriptions = pageMeta.map((p) => p.metadata.description);
    const titles = pageMeta.map((p) => JSON.stringify(p.metadata.title));
    expect(new Set(descriptions).size).toBe(pageMeta.length);
    expect(new Set(titles).size).toBe(pageMeta.length);
  });

  it("canonicalises each page to its own path", () => {
    for (const { path, metadata } of pageMeta) {
      expect(metadata.alternates?.canonical, path).toBe(path);
    }
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

// The daily SEO automation (scripts/seo/) edits guide copy unattended. These are
// the floor it cannot drop below: Google demotes thin and duplicated pages, so a
// run that pads word count or reuses copy across guides must fail the build
// rather than ship.
describe("thin and duplicate content guard", () => {
  const wordsIn = (guide: (typeof guides)[number]) =>
    guide.body
      .flatMap((block) => ("text" in block ? [block.text] : block.items))
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;

  it("gives every guide enough substance to rank", () => {
    for (const guide of guides) {
      expect(wordsIn(guide), guide.slug).toBeGreaterThan(400);
      expect(guide.body.filter((b) => b.type === "h2").length, guide.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it("states a reading time consistent with the actual length", () => {
    // A wrong number here is a small lie to the reader and a mismatch with the
    // Article structured data, at roughly 200 words per minute.
    for (const guide of guides) {
      expect(guide.readingMinutes, guide.slug).toBeGreaterThan(0);
      expect(Math.abs(guide.readingMinutes - wordsIn(guide) / 200), guide.slug).toBeLessThan(4);
    }
  });

  it("never reuses a title or meta description across guides", () => {
    const titles = guides.map((g) => g.title);
    const descriptions = guides.map((g) => g.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("never reuses a whole paragraph across guides", () => {
    const seen = new Map<string, string>();
    for (const guide of guides) {
      for (const block of guide.body) {
        if (block.type !== "p") continue;
        const key = block.text.trim().toLowerCase();
        const owner = seen.get(key);
        expect(owner, `duplicated between ${owner} and ${guide.slug}`).toBeUndefined();
        seen.set(key, guide.slug);
      }
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
