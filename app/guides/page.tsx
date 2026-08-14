import Link from "next/link";
import type { Metadata } from "next";
import { guides } from "@/content/guides";
import { SITE_ID, absoluteUrl, breadcrumbSchema, graph, pageMetadata } from "@/lib/seo";
import MarketingShell from "../_components/MarketingShell";
import JsonLd from "../_components/JsonLd";

const description =
  "Practical guides to dynamic QR codes: choosing between static and dynamic, printing codes that always scan, tracking scans, and building menu codes you can update.";

export const metadata: Metadata = pageMetadata({
  title: "QR code guides",
  description,
  path: "/guides",
});

// Newest first, so the listing reorders itself as guides are added.
const sorted = [...guides].sort((a, b) => b.published.localeCompare(a.published));

export default function GuidesIndexPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={graph(
          breadcrumbSchema([{ name: "Guides", path: "/guides" }]),
          {
            "@type": "CollectionPage",
            "@id": absoluteUrl("/guides"),
            name: "QR code guides",
            description,
            isPartOf: { "@id": SITE_ID },
            hasPart: sorted.map((g) => ({
              "@type": "Article",
              headline: g.title,
              url: absoluteUrl(`/guides/${g.slug}`),
              datePublished: g.published,
              dateModified: g.updated,
            })),
          },
        )}
      />

      <section className="mx-auto w-full max-w-3xl px-6 pt-20 pb-10 sm:pt-28">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">QR code guides</h1>
        <p className="mt-4 text-lg text-muted">
          How to use QR codes so they still work a year after you print them.
        </p>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-24">
        <ul className="divide-y divide-border border-t border-border">
          {sorted.map((guide) => (
            <li key={guide.slug} className="py-8">
              <h2 className="text-xl font-semibold">
                <Link href={`/guides/${guide.slug}`} className="hover:text-[var(--brand)]">
                  {guide.title}
                </Link>
              </h2>
              <p className="mt-2 text-muted">{guide.description}</p>
              <p className="mt-3 text-sm text-muted-2">{guide.readingMinutes} min read</p>
            </li>
          ))}
        </ul>
      </section>
    </MarketingShell>
  );
}
