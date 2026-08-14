import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "@/site.config";
import { guides } from "@/content/guides";
import { ORG_ID, absoluteUrl, graph, pageMetadata } from "@/lib/seo";
import MarketingShell from "./_components/MarketingShell";
import JsonLd from "./_components/JsonLd";

// The homepage targets the head term ("dynamic QR code generator"), so the
// title leads with what the product is rather than the brand name.
export const metadata: Metadata = {
  ...pageMetadata({
    title: "Dynamic QR Code Generator with Scan Analytics",
    description: siteConfig.company.description,
    path: "/",
  }),
  // The one page whose <title> should not have the brand appended twice — the
  // brand is already the site name in search results.
  title: {
    absolute: `${siteConfig.company.name} — Dynamic QR Code Generator with Scan Analytics`,
  },
};

export default function LandingPage() {
  const { hero, features, useCases, faq, links, company } = siteConfig;
  const freePlan = siteConfig.pricing.plans[0];

  return (
    <MarketingShell>
      <JsonLd
        data={graph(
          {
            "@type": "SoftwareApplication",
            "@id": absoluteUrl("/#app"),
            name: company.name,
            applicationCategory: "BusinessApplication",
            applicationSubCategory: "QR Code Generator",
            operatingSystem: "Web browser",
            description: company.description,
            url: absoluteUrl(),
            publisher: { "@id": ORG_ID },
            featureList: features.map((f) => f.title),
            // Only the free plan is self-serve today, so it is the only price
            // we advertise as buyable. Listing the paid tiers as purchasable
            // offers while checkout is closed would be a false claim.
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description: freePlan.description,
              availability: "https://schema.org/InStock",
              url: absoluteUrl("/pricing"),
            },
          },
          {
            "@type": "FAQPage",
            "@id": absoluteUrl("/#faq"),
            mainEntity: faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          },
        )}
      />

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-20 pb-16 text-center sm:pt-28">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          {hero.headline}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          {hero.subheadline}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href={links.signUp}
            className="rounded-md px-5 py-3 text-sm font-medium text-[var(--brand-fg)] [background:var(--brand)] hover:[background:var(--brand-hover)]"
          >
            {hero.primaryCta}
          </Link>
          <Link
            href="/pricing"
            className="rounded-md border border-border px-5 py-3 text-sm font-medium hover:border-border-strong"
          >
            {hero.secondaryCta}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight">
          Everything a QR code should have done from the start
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border p-6"
            >
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What a dynamic code is — the explanatory copy search engines need to
          understand what this page is for. */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight">
            What makes a QR code dynamic?
          </h2>
          <p className="mt-6 text-muted">
            A static QR code encodes your destination directly into the pattern. It works
            forever, but it can never change — if the link moves, every printed copy is
            dead paper.
          </p>
          <p className="mt-4 text-muted">
            A dynamic QR code encodes a short tracking link that you control instead. The
            printed pattern never has to change, so you can repoint it whenever you like,
            schedule when it goes live, put it behind a password, or split scans across two
            landing pages to see which one wins. Because every scan passes through a link
            you own, it is also the only kind of QR code that can be measured at all.
          </p>
          <p className="mt-4 text-muted">
            The short link keeps the pattern coarse too, which matters more than people
            expect: fewer, larger modules survive small print, curved surfaces, and bad
            lighting far better than a dense grid encoding a long URL.
          </p>
          <Link
            href="/guides/dynamic-vs-static-qr-codes"
            className="mt-6 inline-block text-sm font-medium text-[var(--brand)] hover:underline"
          >
            Read the full comparison →
          </Link>
        </div>
      </section>

      {/* Use cases */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight">
          What people use dynamic QR codes for
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <div key={useCase.title} className="rounded-xl border border-border p-6">
              <h3 className="text-base font-semibold">{useCase.title}</h3>
              <p className="mt-2 text-sm text-muted">{useCase.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ — kept visible because FAQPage structured data is only valid for
          questions a visitor can actually read on the page. */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold tracking-tight">Frequently asked questions</h2>
        <dl className="mt-10 max-w-3xl divide-y divide-border border-t border-border">
          {faq.map((item) => (
            <div key={item.question} className="py-6">
              <dt className="text-base font-semibold">{item.question}</dt>
              <dd className="mt-2 text-muted">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Guides — internal links so the deeper content gets crawled. */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold tracking-tight">Guides</h2>
        <ul className="mt-8 grid max-w-3xl gap-4">
          {guides.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/guides/${guide.slug}`}
                className="text-muted underline decoration-border underline-offset-4 hover:text-[var(--brand)]"
              >
                {guide.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="rounded-2xl px-8 py-14 text-center [background:var(--brand)]">
          <h2 className="text-2xl font-bold text-[var(--brand-fg)] sm:text-3xl">
            Ready to create your first QR code?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--brand-fg)]/80">
            {siteConfig.company.description}
          </p>
          <Link
            href={links.signUp}
            className="mt-8 inline-block rounded-md bg-background px-5 py-3 text-sm font-medium text-foreground hover:opacity-90"
          >
            {hero.primaryCta}
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
