# SEO log

Written by the daily SEO maintenance task (`scripts/seo/`). Newest entry last.
Each run appends one entry, including runs that changed nothing.

Raw transcripts live in `scripts/seo/logs/` and are not committed.

---

## 2026-08-18 — task created

**Searched:** nothing yet; this entry records the automation being set up.

**Changed:** added `scripts/seo/` (prompt, runner, task registration) and a
thin-content guard in `tests/unit/seo.test.ts`.

**Tests:** see the setup commit.

**Opportunities not acted on:** new keyword-targeted pages are deliberately out
of scope for the automated job — see `scripts/seo/README.md`.

---

## 2026-08-22 — meta descriptions into the snippet band

**Searched:** Google Search Central documentation updates and blog (July–August
2026), plus general reporting on August ranking volatility. What I learned:

- No confirmed Google algorithm update in August 2026. The last confirmed
  ranking change is the June 2026 spam update (24–26 June); the 2026 core
  updates were March and May. Rank-tracker chatter about 5–6 August is not
  matched by anything on the Search Status Dashboard, so there is nothing here
  to react to.
- Documentation changes in the window are narrow and none apply to this site:
  preferred-sources button (20 Aug), review-snippet incentivised-review rules
  (24 Jul), package tracking (14 Jul), `Product.category` codes and Offer sale
  duration `validFrom`/`validThrough`/`priceValidUntil` (7 Jul), canonicalisation
  re-evaluation timing (10 Jul). The Offer sale-duration properties are for
  merchant listings of goods on sale; our plans are open-ended subscriptions, so
  adding `priceValidUntil` would assert an expiry that does not exist.
- Google's generative-AI optimisation guide (May 2026, still the current primary
  source) explicitly mythbusts the things an automated job is tempted to do:
  no `llms.txt`, no AI-specific markup, no content chunking, and do not
  over-invest in structured data. Its advice is ordinary technical SEO. That
  pushed this run toward snippet quality rather than new markup.

**Changed:** the meta descriptions on `/pricing`, `/docs`, and `/guides`. All
three sat outside the 120–155 band, so Google was either wasting the snippet or
truncating and rewriting it:

- `/pricing` was 106 — too short, and half of it repeated the `<h1>` subheading
  visible on the page ("Start free. Upgrade when you grow. Cancel anytime.").
  Now 147, leading with the free-tier limit and Pro's price and headline
  features. Still interpolated from `siteConfig.pricing.plans`, so the price in
  the snippet cannot drift from what Checkout charges.
- `/docs` was 159. Now 149, reordered to lead with what the API does rather
  than a list of section names.
- `/guides` was 163 (confirmed by the new test). Now 150. This string also
  feeds the `CollectionPage` description in the JSON-LD, which is why it is a
  single const.

`/` was already 145 and is untouched. Bumped `lastModified` for the three
changed routes in `app/sitemap.ts` from 2026-07-29 to 2026-08-22 — a new
snippet is exactly the kind of change worth a recrawl.

Extended `tests/unit/seo.test.ts` with a `marketing page meta descriptions`
block that imports each page's exported `metadata` and asserts the 120–155
band, no reuse of a title or description between pages, and a self-canonical.
Verified the band assertion has teeth by restoring the old `/guides` string
first: it failed with "expected 163 to be less than or equal to 155".

**Tests:** `npm test` 290 passed (39 files), `npm run lint` clean,
`npm run typecheck` clean.

**Opportunities not acted on:**

- **Homepage `SoftwareApplication.offers` is stale.** `app/page.tsx` advertises
  only a single $0 offer, justified by a comment saying paid checkout is closed.
  That stopped being true on 2026-07-30 when self-serve Stripe subscriptions
  shipped; live session creation was verified 2026-08-12, `available` is `true`
  for all three tiers, and `/pricing` already emits all three as `InStock`. The
  fix is an `AggregateOffer` (lowPrice 0, highPrice 49) derived from
  `siteConfig.pricing.plans` so it cannot drift again. Left for a human because
  it makes a purchasability claim and billing launch is not formally signed off
  (`BILLING-CHECKLIST.md` still has open verification items).
- **Guide meta descriptions are all long.** Three of the four run roughly
  165–185 characters; the existing guard permits up to 300. Tightening them is a
  bigger content edit than it looks, because `guide.description` doubles as the
  visible standfirst on the guide page and the blurb in the listing, so the copy
  has to read well in three places at once. Worth its own run.
- **Homepage `<title>` is 63 characters**, marginally over the ~60 guideline.
  Left alone: it is a deliberate head-term title and the overflow is one word.
- Sitemap `lastModified` for `/` is 2026-07-29 while `app/page.tsx` and
  `site.config.ts` last changed 2026-07-30. One day of drift, not worth a bump
  on its own; it will be corrected the next time the homepage content changes.
