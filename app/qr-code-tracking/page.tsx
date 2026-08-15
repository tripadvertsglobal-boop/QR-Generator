import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "@/site.config";
import {
  ORG_ID,
  SITE_ID,
  absoluteUrl,
  breadcrumbSchema,
  faqSchema,
  graph,
  pageMetadata,
} from "@/lib/seo";
import MarketingShell from "../_components/MarketingShell";
import JsonLd from "../_components/JsonLd";

/**
 * The hub page for the tracking search cluster ("qr code scan tracking",
 * "how to track qr codes", "track qr code scans"). The guide at
 * /guides/tracking-qr-code-scans covers the same subject editorially — this
 * page is the commercial counterpart, so keep it about what the product does
 * and leave the "what the numbers mean" essay to the guide.
 *
 * Every capability claimed below is enforced somewhere real: scan counting and
 * bot filtering in lib/scan-agent.ts, the timeseries in the get_scan_timeseries
 * RPC, geography in get_scan_geo (paid — see lib/plan.ts geoAnalytics), and the
 * API in app/api/v1/qrcodes/[id]/analytics. Do not add a bullet without one.
 */

const path = "/qr-code-tracking";

const description =
  "Track QR code scans without a tracking pixel or an app. Every dynamic code counts its scans, charts them by day, and shows where they came from — with bot traffic filtered out and no raw IP addresses stored.";

export const metadata: Metadata = pageMetadata({
  title: "QR Code Scan Tracking",
  description,
  path,
});

// Rendered as visible numbered steps only. Deliberately not emitted as HowTo
// structured data — that markup no longer earns a rich result.
const steps = [
  "Create a dynamic QR code and point it at your destination. The pattern encodes a short link on our domain, not your URL.",
  "Print or publish the code. Nothing else has to change — no script on your landing page, no app for the person scanning.",
  "Every scan hits the short link first. We record it, then redirect the phone onward, usually inside a second.",
  "Read the numbers in the dashboard: a running total, a day-by-day chart, and the location each scan came from.",
  "Give each placement its own code so the totals answer a question. One code across every surface gives you one number.",
];

const tracked = [
  {
    title: "Total scans per code",
    body: "A running count on every dynamic code, visible on the code's page and in the list view. Included on every plan, free included.",
  },
  {
    title: "Scans per day",
    body: "A day-by-day timeseries you can chart over any window up to a year. The trend is where the signal is — a total tells you a code worked, a trend tells you when.",
  },
  {
    title: "Where the scan came from",
    body: "Country, region, and city, derived from the network the request arrived on. The aggregated country breakdown is a paid-plan feature.",
  },
  {
    title: "Which destination won",
    body: "Split scans across two or more destinations by weight and compare them, so an A/B test runs on the printed code rather than the landing page.",
  },
  {
    title: "Which placement earned it",
    body: "Folders and tags group codes by campaign, channel, or print run, so you can compare packaging against posters against events.",
  },
  {
    title: "The raw scan log",
    body: "The most recent scans with their timestamp and place, plus an account-level audit log of every change made to a code.",
  },
];

const faq = [
  {
    question: "How do you track QR codes?",
    answer:
      "By routing them through a link you control. A dynamic QR code encodes a short URL on our domain instead of your destination, so every scan reaches our server before the phone reaches your page. We count that request and redirect onward. A static QR code encodes your destination directly, never touches anything you own, and therefore cannot be tracked at all — no service can retrofit tracking onto one without reprinting it.",
  },
  {
    question: "Can you track how many times a QR code is scanned?",
    answer:
      "Yes, on every plan. Each dynamic code carries a running total and a per-day count. The figure is filtered rather than raw: link-preview bots, crawlers, and uptime monitors are discarded, and rapid repeat hits from the same source are collapsed, so someone who scans twice while waiting is not counted as two people.",
  },
  {
    question: "Can you track a QR code you have already printed?",
    answer:
      "Only if it was dynamic when you generated it. If the printed pattern encodes your destination URL directly, there is no way to add tracking after the fact, because the fix would be a different pattern. One rescue works if the destination is on a domain you own: turn that URL into a redirect of your own and you can count hits there.",
  },
  {
    question: "Do people need an app to be tracked?",
    answer:
      "No. Tracking happens on our side of the redirect, so the person scanning uses their normal phone camera and notices nothing beyond a page opening. There is no script to add to your landing page either.",
  },
  {
    question: "Can I see who scanned my QR code?",
    answer:
      "No, and neither can anyone else. A scan is an anonymous web request, so there is no name, email, or phone number attached unless the person later signs in or fills something out on your page. Location is coarse too — it comes from network routing, so a mobile scan can resolve to the city where the carrier's gateway sits. Treat city-level data as a strong hint, not a fact.",
  },
  {
    question: "How soon do tracked scans appear?",
    answer:
      "Right away. The scan is recorded as part of the redirect, so it shows up on the code's page on your next refresh rather than in a batch hours later.",
  },
  {
    question: "Can I pull scan data into my own tools?",
    answer:
      "Yes, on paid plans. A scoped API key gets you the per-day timeseries for any code over a window you choose, plus webhooks and CSV export. The endpoint is documented in the API reference.",
  },
  {
    question: "Does scan tracking respect privacy?",
    answer:
      "Raw IP addresses are never stored — they are hashed with a keyed function so a stored scan cannot be reversed to an address, while still being stable enough to dedupe repeat hits. You get counts and coarse geography, not people. Tell your visitors what you collect in your privacy policy and you are on solid ground.",
  },
];

export default function QrCodeTrackingPage() {
  const { links, hero } = siteConfig;

  return (
    <MarketingShell>
      <JsonLd
        data={graph(
          breadcrumbSchema([{ name: "QR code tracking", path }]),
          {
            "@type": "WebPage",
            "@id": absoluteUrl(path),
            name: "QR code scan tracking",
            description,
            inLanguage: "en",
            isPartOf: { "@id": SITE_ID },
            about: {
              "@type": "Thing",
              name: "QR code tracking",
              description:
                "Counting and analysing scans of a QR code by routing it through a redirect the owner controls.",
            },
            publisher: { "@id": ORG_ID },
          },
          faqSchema(`${path}#faq`, faq),
        )}
      />

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-20 pb-16 sm:pt-28">
        <div className="max-w-3xl">
          <p className="text-sm font-extrabold uppercase tracking-widest text-[var(--brand)]">
            QR code tracking
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Track QR code scans without a pixel, a tag, or an app
          </h1>
          <p className="mt-6 text-lg text-muted">
            Every dynamic code you make here counts its own scans. You get a running total, a
            day-by-day trend, and where each scan came from — from the moment the code is
            printed, with nothing to add to your landing page.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href={links.signUp}
              className="px-5 py-3 text-sm font-medium text-[var(--brand-fg)] [background:var(--brand)] hover:[background:var(--brand-hover)]"
            >
              {hero.primaryCta}
            </Link>
            <Link
              href="/guides/tracking-qr-code-scans"
              className="border border-border px-5 py-3 text-sm font-medium hover:border-border-strong"
            >
              Read the tracking guide
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight">How do you track QR codes?</h2>
          <p className="mt-6 text-muted">
            A QR code is a picture of some text, and a phone reading text does not report back
            to anyone. Tracking works by changing what the text says. Instead of encoding your
            destination, a dynamic code encodes a short link on our domain — so the scan
            arrives somewhere you control, gets counted, and is forwarded on. That single hop
            is the whole mechanism.
          </p>
          <ol className="mt-8 space-y-4">
            {steps.map((step, i) => (
              <li key={step} className="flex gap-4 text-muted">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-xs font-extrabold text-[var(--brand-fg)] [background:var(--brand)]"
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What gets tracked */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight">
          What QR code scan tracking shows you
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tracked.map((item) => (
            <div key={item.title} className="border border-border p-6">
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Honest limits — the counterweight to the section above. */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight">
            Why a tracked scan count is lower than you expect
          </h2>
          <p className="mt-6 text-muted">
            A good analytics pipeline throws requests away. When someone pastes your tracking
            link into a chat app, that app fetches it to build a preview — sometimes several
            times over. Uptime monitors, search crawlers, and security scanners hit it too.
            None of those are a person holding a phone, so none of them are counted.
          </p>
          <p className="mt-4 text-muted">
            The result is a number lower than the raw hit count and much closer to the truth.
            If a provider&apos;s scan figures look suspiciously high, the useful question is what
            they filter.
          </p>
          <h3 className="mt-10 text-lg font-semibold">What tracking cannot tell you</h3>
          <ul className="mt-5 space-y-2">
            {[
              "Who scanned it. There is no identity attached to an anonymous web request.",
              "A precise location. Geography comes from network routing, not GPS — be sceptical of any tool that shows you a pin on a street.",
              "Anything about a static QR code. Nothing you own is ever contacted, so there is nothing to count.",
              "What happened after the scan. Add campaign parameters to the destination and let your web analytics take it from there.",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-muted">
                <span aria-hidden className="text-[var(--brand)]">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* API */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight">
            Track QR code scans from your own code
          </h2>
          <p className="mt-6 text-muted">
            Paid plans include scoped API keys. Ask any code for its per-day scan series over a
            window of up to a year, or subscribe to a webhook and have scans pushed to you.
          </p>
          <pre className="mt-6 overflow-x-auto border border-border p-5 font-mono text-sm text-muted">
            <code>{`GET /api/v1/qrcodes/{id}/analytics?days=30
X-API-Key: qr_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

{ "days": 30, "series": [{ "day": "2026-08-01", "scan_count": 42 }, ...] }`}</code>
          </pre>
          <Link
            href="/docs"
            className="mt-6 inline-block text-sm font-medium text-[var(--brand)] hover:underline"
          >
            Read the API reference →
          </Link>
        </div>
      </section>

      {/* FAQ — visible because FAQPage markup is only valid for questions a
          reader can actually find on the page. */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold tracking-tight">
          QR code tracking questions
        </h2>
        <dl className="mt-10 max-w-3xl divide-y divide-border border-t border-border">
          {faq.map((item) => (
            <div key={item.question} className="py-6">
              <dt className="text-base font-semibold">{item.question}</dt>
              <dd className="mt-2 text-muted">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="px-8 py-14 text-center [background:var(--brand)]">
          <h2 className="text-2xl font-bold text-[var(--brand-fg)] sm:text-3xl">
            Start tracking your QR codes
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--brand-fg)]/80">
            The free plan includes three dynamic codes with scan tracking on all of them. No
            credit card, no tag to install.
          </p>
          <Link
            href={links.signUp}
            className="mt-8 inline-block bg-background px-5 py-3 text-sm font-medium text-foreground hover:opacity-90"
          >
            {hero.primaryCta}
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
