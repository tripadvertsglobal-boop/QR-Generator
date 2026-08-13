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

- [x] **`STRIPE_SECRET_KEY` on the Worker was invalid. FIXED and verified 2026-08-12.** Found
      immediately after the hang below was fixed. Checkout failed fast with a 502 instead of
      hanging, and the Worker logged Stripe's actual rejection:
      `Invalid API Key provided: mk_1SfhD***************T5CJ`.

      Resolved by replacing it with a live **restricted key** (`rk_live_…`). Took two attempts:
      the first replacement went into a typo'd secret name (`STRIP_SECRET_KEY`, missing the E)
      that nothing reads, so the app kept using the old `mk_` value. Listing secret *names* via
      `GET /accounts/{account_id}/workers/scripts/{script}/secrets` is what caught it — that
      endpoint never returns values and is the fast way to check this.

      `mk_` is a Stripe **managed API key** — per Stripe's docs, a secret key that a *hosting
      platform* delivers to your app and rotates for you. This one is from the **Vercel** Stripe
      integration, back when this project ran on Vercel. It was carried across in the Cloudflare
      migration, but nothing on Cloudflare issues or rotates a managed key, so Stripe rejects it.

      **Fix:** create a real live key for `acct_1SfhDB1wP2GH31b7` in the Stripe Dashboard —
      Stripe now recommends a restricted key (`rk_live_…`) over a secret key (`sk_live_…`) — and
      set it as the Worker secret: `npx wrangler secret put STRIPE_SECRET_KEY`.

      **Why this hid for so long:** the entry below records these secrets as "verified present
      via the Workers API (**names only** — values were never read back)". Presence was checked,
      validity never was, and the 80s hang meant no Stripe response ever came back to reveal it.
      `STRIPE_WEBHOOK_SECRET` was verified the same name-only way and is therefore equally
      unproven until a real delivery verifies it.

- [x] **Checkout hung ~80s and 502'd in production. FIXED and verified live 2026-08-12**
      (commit `0d6a234`, build `93d9a55f`).

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

      *Fix.* `lib/stripe.ts` passes `httpClient: Stripe.createFetchHttpClient()` explicitly,
      forcing the fetch-based client regardless of which build gets bundled. Commit `da44b2d`
      then did the same for the webhook's crypto provider
      (`Stripe.createSubtleCryptoProvider()`), which had the identical latent problem:
      `constructEventAsync` resolves to `NodeCryptoProvider`/`node:crypto` on the Node build, so
      the async variant alone never selected WebCrypto the way the old comment claimed.

      *Verified live 2026-08-12* by clicking **Start Pro** on qrbuilderstudio.com as the
      throwaway account: `POST /api/v1/billing/checkout` now returns in seconds with a genuine
      Stripe API response instead of stalling 80s. That response is an auth rejection, which is
      the separate `mk_` key blocker recorded above — the networking half is fixed.

      *The generalisable lesson:* on this stack the `workerd` export condition is never reached
      for anything Next bundles into a Route Handler. If an SDK offers a Workers build behind
      that condition, assume you are not getting it and pass the fetch/WebCrypto implementations
      explicitly. A hang rather than an error is the signature of a `node:*` API that workerd
      stubs rather than implements.

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
- [x] Checkout **Session** flow, up to the Stripe Checkout page. **Verified live 2026-08-12**
      as `claude-billing-verify-20260812@example.com` (`f03920ef-…`):
      `POST /api/v1/billing/checkout` returned **200 in 4.2s** with a live session URL
      (`cs_live_a1osDZwz…`). Customer `cus_V3oS7P3O77KP1n` was created on the live account with
      `metadata.user_id` matching, and `user_profiles.stripe_customer_id` now holds that id.
      So `customers.create()` + `checkout.sessions.create()` + the persistence write all work.
      Payment itself was deliberately not completed, so everything downstream of the Checkout
      page remains unverified — see the webhook item above.

      *Testing note:* driving this through a browser click proved unreliable (the click often
      did not fire the handler, and Worker log ingestion was ~6.5h behind, making the logs
      useless for live debugging). Issuing the request straight from the page context —
      `fetch('/api/v1/billing/checkout', {method:'POST', credentials:'include',
      body:'{"plan":"pro"}'})` — is far more reliable and returns the response body, which the
      UI swallows.
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
- [x] **A comped account could hand its own plan back to Stripe.** An account on a paid plan
      with no `stripe_customer_id` was comped — its plan set by hand, the webhook being
      otherwise the only writer of `user_profiles.plan`. Nothing stopped such an account from
      opening Checkout, and `POST /api/v1/billing/checkout` stamps `stripe_customer_id` before
      redirecting. That column is precisely what `applySubscription` falls back to when a
      subscription carries no `metadata.user_id`, so from that moment on a single
      `customer.subscription.deleted` could write a hand-granted plan down to `free`.

      Fixed 2026-08-13 (branch `guard-comped-accounts`, commit `3b48f29`): the checkout route
      rejects a paid plan with a null customer id with a 409, ordered *before* the
      already-subscribed 409 so the message names the comp instead of pointing at a portal the
      account has no customer for. The profile read's `error` is now captured rather than
      discarded — a failed read was indistinguishable from "not comped", so the guard failed
      **open** at exactly the wrong moment; it now 503s, matching the fail-closed rule
      `lib/plan.ts` sets out. `/pricing` and `/dashboard/account` hide their upgrade CTAs to
      match, but that is presentation only — the route is the boundary. The route had **no
      tests at all**; `tests/api/billing-checkout.test.ts` now covers the guard, both
      fail-closed paths, message ordering against the already-subscribed case, and the
      ordinary free→Pro and Pro→Business purchases (9 tests).

      **To comp an account:** set `user_profiles.plan` and leave `stripe_customer_id` null.
      The null is load-bearing — it is what keeps the grant unreachable by any webhook, and it
      is what the guard keys on. Do not "tidy up" a comped account by attaching a Stripe
      customer to it. Comped in prod as of 2026-08-13: `tech@tripadverts.com`
      (`b6e88f4c-4d53-45bc-988a-17bc4b2864d9`, `business`).

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
- 276 tests pass; typecheck, lint, and production build clean; Stripe SDK confirmed absent
  from client bundles. Whole line re-verified 2026-08-13, not just the count.
