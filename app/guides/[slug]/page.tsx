import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteConfig } from "@/site.config";
import { guides, guideBySlug, type GuideBlock } from "@/content/guides";
import { ORG_ID, SITE_ID, absoluteUrl, breadcrumbSchema, graph, pageMetadata } from "@/lib/seo";
import MarketingShell from "../../_components/MarketingShell";
import JsonLd from "../../_components/JsonLd";

type Props = { params: Promise<{ slug: string }> };

// No generateStaticParams: the root layout reads the auth cookie, so every route
// in the app is server-rendered on demand and the params would go unused.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) return {};

  return pageMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guides/${guide.slug}`,
    article: { published: guide.published, modified: guide.updated },
  });
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function Block({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 className="mt-12 text-2xl font-semibold tracking-tight">{block.text}</h2>;
    case "h3":
      return <h3 className="mt-8 text-lg font-semibold">{block.text}</h3>;
    case "p":
      return <p className="mt-5 text-black/70">{block.text}</p>;
    case "ul":
      return (
        <ul className="mt-5 space-y-2">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-black/70">
              <span aria-hidden className="text-[var(--brand)]">
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="mt-5 space-y-3">
          {block.items.map((item, i) => (
            <li key={item} className="flex gap-3 text-black/70">
              <span
                aria-hidden
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-[var(--brand-fg)] [background:var(--brand)]"
              >
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );
  }
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();

  const path = `/guides/${guide.slug}`;
  // Related guides keep readers on the site and give every guide inbound
  // internal links, which is how the deeper pages get discovered.
  const related = guides.filter((g) => g.slug !== guide.slug).slice(0, 3);

  return (
    <MarketingShell>
      <JsonLd
        data={graph(
          breadcrumbSchema([
            { name: "Guides", path: "/guides" },
            { name: guide.title, path },
          ]),
          {
            "@type": "Article",
            "@id": absoluteUrl(path),
            headline: guide.title,
            description: guide.description,
            datePublished: guide.published,
            dateModified: guide.updated,
            inLanguage: "en",
            author: { "@id": ORG_ID },
            publisher: { "@id": ORG_ID },
            isPartOf: { "@id": SITE_ID },
            mainEntityOfPage: absoluteUrl(path),
          },
        )}
      />

      <article className="mx-auto w-full max-w-3xl px-6 pt-16 pb-24 sm:pt-24">
        <nav aria-label="Breadcrumb" className="text-sm text-black/50">
          <Link href="/guides" className="hover:text-black">
            Guides
          </Link>
        </nav>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{guide.title}</h1>
        <p className="mt-4 text-lg text-black/60">{guide.description}</p>
        <p className="mt-4 text-sm text-black/45">
          <time dateTime={guide.updated}>Updated {formatDate(guide.updated)}</time> ·{" "}
          {guide.readingMinutes} min read
        </p>

        <div className="mt-10">
          {guide.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>

        <aside className="mt-16 rounded-2xl border border-black/10 p-8">
          <h2 className="text-lg font-semibold">Try it on your own codes</h2>
          <p className="mt-2 text-black/60">
            {siteConfig.company.name} gives you {siteConfig.pricing.plans[0].features[0].toLowerCase()} on
            the free plan — editable destinations and scan analytics included.
          </p>
          <Link
            href={siteConfig.links.signUp}
            className="mt-6 inline-block rounded-md px-5 py-3 text-sm font-medium text-[var(--brand-fg)] [background:var(--brand)] hover:[background:var(--brand-hover)]"
          >
            {siteConfig.hero.primaryCta}
          </Link>
        </aside>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-lg font-semibold">Keep reading</h2>
            <ul className="mt-4 space-y-3">
              {related.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guides/${g.slug}`}
                    className="text-black/70 underline decoration-black/20 underline-offset-4 hover:text-[var(--brand)]"
                  >
                    {g.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </MarketingShell>
  );
}
