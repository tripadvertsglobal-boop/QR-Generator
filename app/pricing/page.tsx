import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "@/site.config";
import { ORG_ID, absoluteUrl, breadcrumbSchema, graph, pageMetadata, planOffers } from "@/lib/seo";
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
            // Shared with the homepage's SoftwareApplication so both pages
            // advertise the same prices and the same availability.
            offers: planOffers(),
          },
        )}
      />
      <section className="mx-auto w-full max-w-6xl px-6 pt-20 pb-12 text-center sm:pt-28">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {pricing.heading}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          {pricing.subheading}
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid gap-6 lg:grid-cols-3">
          {pricing.plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col p-8 ${
                plan.highlighted
                  ? "border-2 border-[var(--brand)]"
                  : "border-2 border-border"
              }`}
            >
              {plan.highlighted && (
                <span className="mb-4 inline-block w-fit px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--brand-fg)] [background:var(--brand)]">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-2">{plan.period}</span>
              </div>

              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-[var(--brand)]">✓</span>
                    <span className="text-muted">{feature}</span>
                  </li>
                ))}
              </ul>

              {!plan.available ? (
                <div className="mt-8">
                  <p
                    aria-disabled="true"
                    className="cursor-not-allowed rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium text-muted-2"
                  >
                    {plan.cta}
                  </p>
                  <p className="mt-2 text-center text-xs text-muted-2">
                    This plan isn’t open for sign-up right now.
                  </p>
                </div>
              ) : plan.plan === "free" ? (
                <Link
                  href={plan.href}
                  className={`mt-8 rounded-md px-4 py-2.5 text-center text-sm font-medium ${
                    plan.highlighted
                      ? "text-[var(--brand-fg)] [background:var(--brand)] hover:[background:var(--brand-hover)]"
                      : "border border-border hover:border-border-strong"
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
