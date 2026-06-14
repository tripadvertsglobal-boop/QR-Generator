import Link from "next/link";
import { siteConfig } from "@/site.config";
import MarketingShell from "./_components/MarketingShell";

export default function LandingPage() {
  const { hero, features, links } = siteConfig;

  return (
    <MarketingShell>
      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-20 pb-16 text-center sm:pt-28">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          {hero.headline}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-black/60">
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
            className="rounded-md border border-black/15 px-5 py-3 text-sm font-medium hover:border-black/40"
          >
            {hero.secondaryCta}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-black/10 p-6"
            >
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-black/60">{feature.description}</p>
            </div>
          ))}
        </div>
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
