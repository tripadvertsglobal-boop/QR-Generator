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

- [ ] **CRITICAL, ACTIVE: Checkout hangs and fails in production.** Found 2026-08-12 via a
      real signup + click-through on the live site (throwaway account
      `claude-billing-verify-20260812@example.com`, id `f03920ef-b1bf-410b-9ca4-7419e97db628`
      in prod `rsyfcfqpookqtbmaclxy` — safe to delete, plan stayed `free`, no subscription).
      Signup → auto-resumed checkout-intent flow worked (redirected to
      `/pricing?checkout=pro`, POSTed to `/api/v1/billing/checkout`), but the request hung for
      ~80+ seconds and then failed with "Could not start checkout" (502, the route's catch-all).
      `user_profiles.stripe_customer_id` was **still null** after the failure, meaning
      `client.customers.create()` in `app/api/v1/billing/checkout/route.ts` — the *first*
      Stripe API call the Worker makes — never completed. The ~80s stall matches the Stripe
      Node SDK's default timeout, so this reads as the outbound `fetch()` from the Worker to
      `api.stripe.com` hanging rather than erroring. Not reproducible locally (Windows can't
      run a real `opennextjs-cloudflare build/preview` — symlink `EPERM`), and no working log
      access was found this session: no Stripe MCP connected, and Cloudflare's
      `workers/observability/telemetry/query` REST endpoint (found via the OpenAPI spec, tried
      as an alternative to the WebSocket-only live-tail) returned bare `400`s with no inspectable
      error body across a few parameter-shape attempts — likely enabled or requires a
      wsUrl session outside this tool's plain request/response capability.
      **Next steps for the next session:** (1) check Stripe Dashboard → Developers → Logs for
      any request in the window 2026-08-12 09:46–09:48 UTC — absence means the request never
      left the Worker (points to a Workers→Stripe networking/fetch issue); presence means the
      response got lost on the way back. (2) Check Cloudflare dashboard → Worker → Logs
      (real-time) while re-triggering, for the actual server-side error/stack. (3) Consider
      whether `lib/stripe.ts`'s `new Stripe(key)` needs an explicit `httpClient` /
      `timeout` / Workers-specific fetch config — the comment there assumes the `workerd`
      export condition "just works" with no configuration, which this incident calls into
      question. This blocks the entire billing launch: **checkout is currently non-functional
      for real customers** even though the deploy itself is live and healthy otherwise.

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
