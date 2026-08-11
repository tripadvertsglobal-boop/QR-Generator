import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "@/site.config";
import { ORG_ID, absoluteUrl, breadcrumbSchema, graph, pageMetadata } from "@/lib/seo";
import MarketingShell from "../_components/MarketingShell";
import JsonLd from "../_components/JsonLd";
import CheckoutButton from "./CheckoutButton";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description: `${siteConfig.pricing.subheading} ${siteConfig.pricing.plans[0].features[0]} free, no credit card required.`,
  path: "/pricing",
});

export default function PricingPage() {
  const { pricing } = siteConfig;

  return (
    <MarketingShell>
      <JsonLd
        data={graph(
          breadcrumbSchema([{ name: "Pricing", path: "/pricing" }]),
          {
            "@type": "Product",
            "@id": absoluteUrl("/pricing#product"),
            name: siteConfig.company.name,
            description: siteConfig.company.description,
            brand: { "@id": ORG_ID },
            // availability tracks plan.available: self-serve checkout is only
            // open on the free plan, and claiming otherwise in rich results
            // would send people to a CTA that does not work.
            offers: pricing.plans.map((plan) => ({
              "@type": "Offer",
              name: plan.name,
              description: plan.description,
              price: plan.price.replace(/[^0-9.]/g, ""),
              priceCurrency: "USD",
              url: absoluteUrl("/pricing"),
              availability: plan.available
                ? "https://schema.org/InStock"
                : "https://schema.org/PreOrder",
            })),
          },
        )}
      />
      <section className="mx-auto w-full max-w-6xl px-6 pt-20 pb-12 text-center sm:pt-28">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {pricing.heading}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-black/60">
          {pricing.subheading}
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid gap-6 lg:grid-cols-3">
          {pricing.plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-8 ${
                plan.highlighted
                  ? "border-[var(--brand)] shadow-lg"
                  : "border-black/10"
              }`}
            >
              {plan.highlighted && (
                <span className="mb-4 inline-block w-fit rounded-full px-3 py-1 text-xs font-medium text-[var(--brand-fg)] [background:var(--brand)]">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-black/60">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-sm text-black/50">{plan.period}</span>
              </div>

              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-[var(--brand)]">✓</span>
                    <span className="text-black/70">{feature}</span>
                  </li>
                ))}
              </ul>

              {!plan.available ? (
                <div className="mt-8">
                  <p
                    aria-disabled="true"
                    className="cursor-not-allowed rounded-md border border-black/10 px-4 py-2.5 text-center text-sm font-medium text-black/40"
                  >
                    {plan.cta}
                  </p>
                  <p className="mt-2 text-center text-xs text-black/50">
                    This plan isn’t open for sign-up right now.
                  </p>
                </div>
              ) : plan.plan === "free" ? (
                <Link
                  href={plan.href}
                  className={`mt-8 rounded-md px-4 py-2.5 text-center text-sm font-medium ${
                    plan.highlighted
                      ? "text-[var(--brand-fg)] [background:var(--brand)] hover:[background:var(--brand-hover)]"
                      : "border border-black/15 hover:border-black/40"
                  }`}
                >
                  {plan.cta}
                </Link>
              ) : (
                // Paid tiers go through Stripe Checkout rather than a link —
                // the session has to be created server-side against the
                // caller's account.
                <CheckoutButton
                  plan={plan.plan}
                  label={plan.cta}
                  highlighted={plan.highlighted}
                />
              )}
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
