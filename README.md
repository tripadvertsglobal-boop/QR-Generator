# QR Studio

Dynamic QR codes: generate a code once, change where it points at any time, and
track every scan. The printed code encodes a tracking URL (`/r/<slug>`), never
the destination, so the destination stays editable forever.

## Stack

- **Next.js 16** (App Router). Note: `middleware.ts` is renamed to `proxy.ts`,
  route `params` is a `Promise`, and fire-and-forget work uses `after()` from
  `next/server`. See `AGENTS.md`.
- **Supabase** — Postgres + Auth, with row-level security on every table.
- **Upstash Redis** — slug cache for the redirect hot path, plus rate limiting.
- **Vercel** — hosting, cron, and analytics.

## Getting started

```bash
cp .env.example .env.local   # then fill it in — see the contract below
npm install
npm run dev
```

The app runs without Redis, Safe Browsing, or Sentry configured; each simply
degrades (see the comments in `.env.example`).

### Database

Migrations live in `supabase/migrations/` and are applied in filename order.

```bash
supabase db start    # local Postgres with every migration applied (needs Docker)
supabase db diff     # should report no changes — CI fails on drift
```

## Checks

```bash
npm run lint
npm run typecheck
npm test             # vitest — unit, API route, and component tests
npm run test:e2e     # playwright (opt-in; needs a live Supabase project)
```

CI runs lint, typecheck, tests, and a production build on every PR.

## Configuration contract

`lib/env.ts` is the single source of truth for which environment variables are
required. A **production** build (`VERCEL_ENV=production`) fails outright if a
required variable is missing, or if `site.config.ts` still contains placeholder
company contact details. Local and CI builds are unaffected.

Branding, marketing copy, and pricing all live in `site.config.ts`.

## Plans

`lib/plan.ts` defines the tiers advertised on `/pricing` and the limits the API
enforces. Billing is not implemented yet: every account is `free`, and an
operator upgrades one by setting `user_profiles.plan` to `pro` or `business`
directly. That column is not writable by the account itself — see migration
`00017`. When billing ships it writes the same column.

## Architecture notes

- **Redirects** (`app/r/[slug]/route.ts`) run on the edge runtime and resolve
  from Redis, falling back to a `SECURITY DEFINER` RPC on a cache miss. Scan
  recording happens in `after()`, off the response path.
- **API** (`app/api/v1/*`) accepts either a session cookie/JWT or an
  `X-API-Key`. Under API-key auth the service client bypasses RLS, so every
  query is explicitly scoped by `user_id` — see the note in `lib/auth.ts`.
- **Secrets** are never returned: password hashes are stripped from responses
  and excluded from audit entries.
