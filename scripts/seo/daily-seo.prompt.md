# Daily SEO maintenance run

You are running unattended on a schedule. Nobody is watching, so nothing you do
today may be irreversible or reach production. A human reviews your branch later.

## Hard boundaries

- **Never push, deploy, or run wrangler.** The tool allowlist blocks these; do
  not try to work around it. Your run ends at a local commit.
- **Never touch** `app/api/**`, `lib/billing*`, `lib/stripe*`, `supabase/**`,
  `middleware.ts`, or anything auth-related. This job is marketing SEO only.
- **Do not create new pages or new guides.** Page generation is deliberately off
  for this job. If you find a keyword worth a new page, write it to the
  Opportunities section of `SEO-LOG.md` and leave it for a human.
- If you cannot find a genuine improvement, **make no changes**. A run that
  changes nothing and says so is a good run. Do not invent work.

## Scope: technical SEO and existing pages

Your surface is the public marketing site: `app/page.tsx`, `app/pricing`,
`app/docs`, `app/guides`, `app/sitemap.ts`, `app/robots.ts`, `lib/seo.ts`,
`content/guides.ts`, and `site.config.ts`.

Each run, work through these in order and stop when you have one focused,
defensible change:

1. **Research.** Search the web for SEO changes in the last ~30 days: Google
   ranking/algorithm updates, search-results and AI-overview behaviour, and
   structured-data spec changes. Prefer primary sources (Google Search Central,
   schema.org) over SEO blogs recycling each other. Ignore anything you cannot
   trace to a primary source.
2. **Technical audit.** Check the site against what you found and against
   current best practice: canonicals, metadata completeness, structured-data
   validity, sitemap accuracy (`lastModified` dates that lie, missing or dead
   routes), robots directives, heading hierarchy, internal linking between
   guides, and image/OG metadata.
3. **Titles and meta descriptions (CTR).** These are the highest-leverage,
   lowest-risk edits available to you. A title that is truncated, vague, or
   duplicated across pages is worth fixing. Keep titles under ~60 characters
   and descriptions between 120 and 155.
4. **Existing guide content.** Improve depth and accuracy of guides that are
   already thin or stale. Bump a guide's `updated` date only when the change is
   material, never for typos — the repo comments are explicit about this.

## Content quality rules

- No keyword stuffing, and no rewriting that adds words without adding meaning.
- Never duplicate copy between two pages. If two pages would say the same
  thing, that is a signal to consolidate, not to reword.
- Every claim about the product must be true of this codebase. Verify against
  the code before writing it into marketing copy.

## Verification (required before committing)

Run all of these, and do not commit if any fail:

```
npm test
npm run lint
npm run typecheck
```

`tests/unit/seo.test.ts` is the guard on this work — it covers canonicals,
sitemap integrity, guide slugs, metadata lengths, and thin content. If you
change SEO behaviour, extend that file to cover the change. If a test fails,
fix the cause; never weaken an assertion to make it pass.

## Logging (required, every run — including no-change runs)

Append one dated entry to `SEO-LOG.md` at the repo root, newest last, using the
format already in that file. Record: what you searched and what you learned,
what you changed and why, test results, and any opportunity you found but did
not act on. Be concrete and brief — this log is read by a human deciding
whether to trust the next run.

## Finish

Commit to the branch you are already on with a `seo:` prefixed message
describing the actual change. Then stop. Do not push.
