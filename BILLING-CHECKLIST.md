# Stripe billing — remaining work

Status as of 2026-08-12. Merged to `main` (`c2d68be`) and **deployed to production** as of
commit `a6dbea7`.

Stripe account: **CapitalToMe** `acct_1SfhDB1wP2GH31b7`, **live mode**. This account also
bills unrelated products (medical books, laptop/GPU procurement) — that is deliberate, and
it is why `planForSubscription()` returns `null` rather than `"free"` for a price we don't
sell. Do not "simplify" that null case away.

| Object | ID |
| --- | --- |
| Pro $19/mo | `prod_Uz0fVUBejHWDNQ` / `price_1Tz2do1wP2GH31b7MZxhB8FN` |
| Business $49/mo | `prod_Uz0fB6bmFWXHMm` / `price_1Tz2dv1wP2GH31b7G7hnCFla` |
| Webhook endpoint | `we_1Tz2rS1wP2GH31b753JezsXw` → `/api/stripe/webhook` |
| Portal config | `bpc_1TzBEW1wP2GH31b7E8CnrPCR` (default, active, live) |

---

## Blocking — payments cannot work until these are done

- [ ] **CRITICAL: Checkout hangs and fails in production. Root cause found and fixed in the
      working tree 2026-08-12 — NOT YET DEPLOYED OR VERIFIED LIVE.**

      *Symptom* (found 2026-08-12 via a real signup + click-through on the live site; throwaway
      account `claude-billing-verify-20260812@example.com`, id
      `f03920ef-b1bf-410b-9ca4-7419e97db628` in prod `rsyfcfqpookqtbmaclxy` — safe to delete,
      plan stayed `free`, no subscription): signup → auto-resumed checkout-intent flow worked,
      but `POST /api/v1/billing/checkout` hung ~80s then failed with "Could not start checkout"
      (502). `user_profiles.stripe_customer_id` stayed null — `client.customers.create()`, the
      first Stripe call the Worker makes, never completed.

      *Root cause.* Confirmed from two sides. **Stripe side** (via Stripe MCP, live account):
      `GET /v1/customers` returns **zero customers ever created** — the request never reached
      Stripe at all, and Stripe's API was otherwise fully reachable, ruling out any
      account/key/capability problem. **Cloudflare side** (via the Workers observability API —
      it does work, see note below): the Worker logged
      `Request aborted due to timeout being reached (80000ms)`, the Stripe SDK's own
      `DEFAULT_TIMEOUT`. The reason the outbound call hangs: **Next bundles Route Handler
      dependencies at build time**, so `stripe` is resolved with *Node* export conditions during
      `next build`, long before OpenNext/workerd is involved. The SDK's `workerd` export
      condition therefore never applies, the Node build gets bundled, and its
      `createDefaultHttpClient()` returns a `NodeHttpClient` that issues requests through
      `node:https` — which stalls on workerd instead of erroring. Supabase calls in the very
      same request succeed because they use plain global `fetch`, which is the discriminating
      evidence that general egress was never the problem.

      *Fix.* `lib/stripe.ts` now passes `httpClient: Stripe.createFetchHttpClient()` explicitly,
      forcing the fetch-based client regardless of which build gets bundled. `typecheck`, `lint`
      and all 267 tests pass, but **none of them exercise this path** (Stripe is mocked in
      tests), and the fix could not be run locally — Windows still can't do a real
      `opennextjs-cloudflare build/preview` (symlink `EPERM`). So this is verified as correct
      *reasoning*, not verified *working*. It stays checked-out-but-unticked until a real
      checkout completes in production.

      *To close this item:* deploy to `main`, then re-run a real signup + checkout on the live
      site and confirm (a) a customer now appears in Stripe, (b) `stripe_customer_id` is
      persisted, (c) the redirect to Stripe Checkout happens without the ~80s stall.

      *Tooling note for future sessions:* the Cloudflare Workers observability API **does**
      work and observability **is** enabled (`wrangler.jsonc` has `observability.enabled: true`)
      — the earlier bare `400`s were a request-shape problem. The `events` view errors out when
      non-fetch log lines are in range (schema expects `$workers.outcome`); a `calculations`
      view with `count` grouped by `$metadata.message` sidesteps that and is what surfaced the
      timeout error. Stripe has no API-accessible request-log endpoint — that data is dashboard
      only (Developers → Logs).

- [x] **Portal: add products to `subscription_update`.** Done 2026-08-05 via API on
      `bpc_1TzBEW1wP2GH31b7E8CnrPCR`: Pro then Business, one price each,
      `adjustable_quantity.enabled=false` on both (it defaults to `true`, and no code reads
      subscription quantity — leaving it on lets a customer pay Nx for the same plan).
      Note `features.subscription_update.products` is an **expandable** field: it is absent
      from API responses unless you pass
      `expand[]=features.subscription_update.products`. Absence is not proof it failed.

- [x] **Cloudflare Worker secrets:** set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
      Done 2026-08-11, verified present via the Workers API (names only — values were never
      read back).

- [x] **Cloudflare *build* variables:** set all four `STRIPE_*` vars on the Workers Builds
      trigger. Done 2026-08-11 on the "Deploy default branch" trigger, verified present via
      the Builds API. `lib/env.ts` lists them as REQUIRED and `next.config.ts` asserts the
      contract at build time when `WORKERS_CI_BRANCH=main`, so the deploy would otherwise fail.

- [x] **Merge `stripe-billing` → main and push.** Done 2026-08-11, after both items above
      were confirmed set.

- [x] **Worker exceeded Cloudflare's 3 MiB free-plan size limit.** Discovered 2026-08-11:
      the first two deploy attempts after merging failed at the `wrangler deploy` step, not
      the build step — `next build` and tests were clean, but the bundled Worker (gzip
      ~3.06–3.08 MiB) tripped `code: 10027`. Root cause was **not** the Stripe SDK (it already
      resolves its lighter `workerd` build via package.json `exports`) but `@sentry/nextjs`:
      on the `nodejs` runtime it resolves to `@sentry/node`, which statically pulls in
      OpenTelemetry auto-instrumentation for ~25 unused libraries (Kafka, MySQL, LangChain,
      etc.) plus `import-in-the-middle` — measured at ~2.3 MB raw in isolation via a
      matching-config `esbuild` probe, since Windows can't run the real
      `opennextjs-cloudflare build` locally (`EPERM` on a symlink it needs). Two things had to
      change, not one: `sentry.server.config.ts` / `instrumentation.ts` (commit `b7898de`)
      *and* `lib/log.ts`'s `captureException` (commit `a6dbea7`) — the latter is imported by
      `lib/api-error.ts`, `lib/auth.ts`, `lib/rate-limit.ts` and reachable from nearly every
      route, so fixing only the first two actually made the bundle *bigger* (added
      `@sentry/node-core` without removing the still-reachable heavy path). All three now
      import `@sentry/node-core/light` instead of `@sentry/nextjs` on the Node runtime — same
      `captureException` API, no OpenTelemetry tracing tree (tracing was already off,
      `tracesSampleRate: 0`, so nothing functional was lost). Deploy `f9bc6a22` succeeded
      2026-08-12. `sentry.edge.config.ts` and `instrumentation-client.ts` (browser bundle)
      were left on `@sentry/nextjs` — separate bundles, not implicated in this limit.

## End-to-end verification

Exercised 2026-08-10 in **test mode** against `qrgenerator-testing`, via `stripe listen`
forwarding to `npm run dev`. Test fixtures: `prod_V30DiuMw8lNbw3` / `prod_V30DmUcTTld8z2`.
Read the scope note below before treating any of this as production evidence.

- [x] Webhook flips `user_profiles.plan` to `pro`. Real Stripe events, real signatures:
      `free` → `pro` on `customer.subscription.created`, with `subscription_status`,
      `stripe_subscription_id` and `plan_period_end` all written.
- [x] Plan switch Pro↔Business — swapping the subscription item price moved `plan` to
      `business`.
- [x] Cancel → plan drops to `free` at period end, not immediately. Both halves checked:
      `cancel_at_period_end=true` left the account on `business` with `status=active`;
      deleting the subscription moved it to `free` with `status=canceled`.
- [ ] **Signature verification on Workers** (`constructEventAsync`). Still the highest-risk
      assumption. The runs above verified it against genuine Stripe signatures on **Node**,
      which proves the raw-body handling and the async path — but `npm run dev` is not
      workerd, so the runtime-specific failure this guards against remains untested.
      Only a real deployment taking a real delivery closes this.
- [ ] Checkout **Session** flow itself. **Attempted live 2026-08-12 — failed.** See the
      CRITICAL item at the top of "Blocking": the checkout POST hangs ~80s and 502s,
      `client.customers.create()` never completes. Not a "not yet exercised" gap anymore —
      this is a confirmed broken path.
- [ ] Billing portal opens from **Manage billing** on `/dashboard/account`.
- [ ] A `past_due` subscription retains access. Unit-tested in `tests/api/stripe-webhook.test.ts`,
      but not reproduced live — it needs a failing card and a test clock.

## Non-blocking, worth deciding

- [x] Portal `privacy_policy_url` / `terms_of_service_url` were `null`. Set 2026-08-05 to
      `https://qrbuilderstudio.com/privacy` and `/terms`.
- [x] Portal `proration_behavior` is `always_invoice` — but `schedule_at_period_end.conditions`
      is `[decreasing_item_amount, shortening_interval]`, so downgrades are already deferred
      to period end. `always_invoice` only bites on upgrades. No change needed.
- [x] Add `STRIPE_*` to local `.env.local`. Resolved by 2026-08-11: all four vars
      (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`,
      `STRIPE_PRICE_BUSINESS`) are present, and `STRIPE_SECRET_KEY` is a test-mode `sk_test_`
      key, not live — dev checkouts no longer risk real charges.
- [x] `qrgenerator-testing` Supabase project (`gyoqcwgregxfvhpdubym`) was 5 migrations behind.
      Caught up 2026-08-05: 00016–00021 applied, now level with prod. Verified `authenticated`
      still holds UPDATE on only `avatar_url, display_name, timezone`, so `plan` and the
      billing columns stay service-role-only there too. Security advisors show no new
      findings (the SECURITY DEFINER warnings are the deliberate anon redirect path and the
      owner analytics RPCs).

## Known gaps in the code as shipped

- [x] Signed-out visitor clicking **Start Pro** lost the checkout intent. Fixed 2026-08-05,
      but **not** with a general `next` param: `lib/checkout-intent.ts` carries only
      `?plan=pro|business`, which narrows to null on anything else, so there is no arbitrary
      path to validate and no redirect hole to get wrong. The intent survives password
      login/signup, the confirmation email, the Google round trip via `/auth/callback`, and
      the login↔signup cross-links; `/pricing?checkout=<plan>` then resumes checkout.
- [x] The webhook trusts each event payload instead of re-fetching the subscription. Fixed
      2026-08-05: `applySubscription` now retrieves the live subscription and uses the event
      only for its id. Costs one extra API call per event; a failed retrieve 500s and Stripe
      retries. The receiver also had **no tests at all** — `tests/api/stripe-webhook.test.ts`
      now covers signature rejection, tier mapping, `past_due` grace, deletion, foreign
      subscriptions, customer-id fallback, and out-of-order delivery (14 tests).
- [ ] Business-tier bullets *priority support* and *onboarding assistance* are not
      enforceable in code. Pre-existing, and `lib/plan.ts` documents that deliberately.

---

## Already done

- Live products + prices created; webhook endpoint registered for
  `customer.subscription.created|updated|deleted`.
- Migration `00021_stripe_billing` **applied to prod** (`rsyfcfqpookqtbmaclxy`). Verified
  `authenticated` still holds UPDATE on only `avatar_url`, `display_name`, `timezone`, so
  `plan` and the billing columns stay service-role-only and self-upgrade remains impossible.
  Note the prod schema is ahead of `main` until the branch merges.
- `lib/stripe.ts`, checkout + portal routes (`jwtOnly`), webhook receiver, `/pricing`
  checkout CTAs, **Manage billing** on the account page.
- 237 tests pass; typecheck, lint, and production build clean; Stripe SDK confirmed absent
  from client bundles.
