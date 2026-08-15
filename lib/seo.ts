import type { Metadata } from "next";
import { siteConfig } from "@/site.config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

/** Shared social image. Pre-rendered to public/og.png by scripts/og-image.mjs. */
export const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: `${siteConfig.company.name} — ${siteConfig.company.tagline}`,
};

/**
 * Complete metadata for one page.
 *
 * Next merges metadata between segments *shallowly*, so a page that sets its
 * own `openGraph` replaces the root layout's wholesale — silently dropping the
 * shared og:image. Building the whole object here is what keeps that from
 * happening one page at a time.
 *
 * `title` is passed bare (no brand suffix): the root layout's title template
 * appends it for the document title, and this adds it for social cards, which
 * have no template of their own.
 */
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  /** "article" adds published/modified times to the OG tags. */
  article?: { published: string; modified: string };
  /** Set false for pages that must stay out of the index (auth screens). */
  index?: boolean;
}): Metadata {
  const { title, description, path, article, index = true } = opts;
  const socialTitle = `${title} — ${siteConfig.company.name}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    ...(index ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      siteName: siteConfig.company.name,
      locale: "en_US",
      images: [OG_IMAGE],
      ...(article
        ? {
            type: "article" as const,
            publishedTime: article.published,
            modifiedTime: article.modified,
          }
        : { type: "website" as const }),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

/**
 * Absolute URL for a site-relative path. Page metadata can use relative
 * canonicals (Next resolves them against metadataBase), but structured data
 * cannot — schema.org `@id` and `url` values must be absolute.
 */
export function absoluteUrl(path = "/"): string {
  return path === "/" ? APP_URL : `${APP_URL}${path}`;
}

// Stable @id values so the Organization/WebSite nodes emitted on every page are
// understood as one entity rather than a new one per URL.
export const ORG_ID = `${APP_URL}/#organization`;
export const SITE_ID = `${APP_URL}/#website`;

/** Publisher/author node, referenced by @id from the per-page graphs. */
export function organizationSchema() {
  const { company, contact, social } = siteConfig;
  const sameAs = Object.values(social).filter(Boolean);
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: company.name,
    // The ways the brand is actually written in the wild — the domain drops the
    // space, people drop "Builder". Declaring them keeps search engines from
    // treating each spelling as a different company.
    alternateName: ["QRStudio", "QR Studio Builder", "QR Builder Studio"],
    url: absoluteUrl(),
    description: company.description,
    logo: absoluteUrl("/og.png"),
    ...(contact.email && {
      contactPoint: {
        "@type": "ContactPoint",
        email: contact.email,
        contactType: "customer support",
      },
    }),
    ...(sameAs.length > 0 && { sameAs }),
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    name: siteConfig.company.name,
    url: absoluteUrl(),
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
  };
}

/**
 * Offer nodes for the pricing tiers.
 *
 * Shared by the homepage `SoftwareApplication` and the `/pricing` `Product` so
 * the two can never disagree about what is on sale. Both derive from
 * site.config, so adding or repricing a tier updates the structured data too.
 *
 * `availability` follows each plan's `available` flag — the kill switch for
 * closing a tier — because advertising a buyable price in a rich result and
 * then showing a dead CTA is exactly the mismatch that gets markup penalised.
 */
export function planOffers() {
  return siteConfig.pricing.plans.map((plan) => {
    const amount = plan.price.replace(/[^0-9.]/g, "");
    return {
      "@type": "Offer",
      name: plan.name,
      description: plan.description,
      price: amount,
      priceCurrency: "USD",
      // Every tier is a monthly subscription. Without the reference quantity a
      // bare "19" reads as a one-off purchase.
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: amount,
        priceCurrency: "USD",
        referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
      },
      url: absoluteUrl("/pricing"),
      availability: plan.available
        ? "https://schema.org/InStock"
        : "https://schema.org/PreOrder",
    };
  });
}

/**
 * FAQPage node for a page's question list.
 *
 * Google only honours this markup when the same questions are visible in the
 * page body, so every caller must render the identical list rather than
 * emitting questions that exist only in the schema.
 *
 * `hash` makes the @id unique per page (e.g. "/#faq"), since a page can carry
 * only one FAQPage node but the site carries several.
 */
export function faqSchema(hash: string, items: readonly { question: string; answer: string }[]) {
  return {
    "@type": "FAQPage",
    "@id": absoluteUrl(hash),
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** Trail for a sub-page. The site is shallow, so two or three levels is all. */
export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * Wraps nodes in a single @graph. One script tag per page keeps the entities
 * cross-referenced by @id instead of repeating the Organization inline.
 */
export function graph(...nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
