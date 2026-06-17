import type { ReactNode } from "react";
import MarketingShell from "./MarketingShell";

export type LegalSection = { heading: string; body: ReactNode };

// Shared layout for legal / policy pages (privacy, terms, cookies, etc.).
export default function LegalPage({
  title,
  lastUpdated,
  intro,
  sections,
}: {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <MarketingShell>
      <article className="mx-auto w-full max-w-3xl px-6 pt-20 pb-24 sm:pt-28">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-black/50">Last updated: {lastUpdated}</p>
        <p className="mt-6 text-lg text-black/70">{intro}</p>

        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold">{section.heading}</h2>
              <div className="mt-3 space-y-3 leading-relaxed text-black/70">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </article>
    </MarketingShell>
  );
}
