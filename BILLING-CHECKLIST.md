# Stripe billing — remaining work

Status as of 2026-07-31. Branch `stripe-billing`, commit `990d26c` (not merged, not pushed).

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

- [x] **Portal: add products to `subscription_update`.** Done 2026-08-05 via API on
      `bpc_1TzBEW1wP2GH31b7E8CnrPCR`: Pro then Business, one price each,
      `adjustable_quantity.enabled=false` on both (it defaults to `true`, and no code reads
      subscription quantity — leaving it on lets a customer pay Nx for the same plan).
      Note `features.subscription_update.products` is an **expandable** field: it is absent
      from API responses unless you pass
      `expand[]=features.subscription_update.products`. Absence is not proof it failed.

- [ ] **Cloudflare Worker secrets:** set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
      The webhook secret is in the Stripe Dashboard under the endpoint above — it is
      deliberately not recorded in this repo.

- [ ] **Cloudflare *build* variables:** set all four `STRIPE_*` vars on the Workers Builds
      trigger. `lib/env.ts` lists them as REQUIRED and `next.config.ts` asserts the contract
      at build time when `WORKERS_CI_BRANCH=main`, so **the deploy fails without them**.
      The two price IDs are already in `wrangler.jsonc` `vars`, but that only covers
      *runtime* — build variables are configured separately.

- [ ] **Merge `stripe-billing` → main and push.** Do this *after* the two items above;
      pushing to `main` auto-deploys, and the build will fail otherwise.

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
- [ ] Checkout **Session** flow itself. The subscriptions above were created through the
      API, not by completing a Stripe Checkout page, so `/api/v1/billing/checkout` and the
      redirect back are not yet exercised.
- [ ] Billing portal opens from **Manage billing** on `/dashboard/account`.
- [ ] A `past_due` subscription retains access. Unit-tested in `tests/api/stripe-webhook.test.ts`,
      but not reproduced live — it needs a failing card and a test clock.

## Non-blocking, worth deciding

- [x] Portal `privacy_policy_url` / `terms_of_service_url` were `null`. Set 2026-08-05 to
      `https://qrbuilderstudio.com/privacy` and `/terms`.
- [x] Portal `proration_behavior` is `always_invoice` — but `schedule_at_period_end.conditions`
      is `[decreasing_item_amount, shortening_interval]`, so downgrades are already deferred
      to period end. `always_invoice` only bites on upgrades. No change needed.
- [ ] Add `STRIPE_*` to local `.env.local`. As of 2026-08-05 only `STRIPE_SECRET_KEY` is
      there (added under the typo'd name `STRIPA_SECRET_KEY`, since corrected) and **it is a
      live `sk_live_` key**. `lib/env.ts` needs all four, so billing routes still 502 under
      `npm run dev`. Swap in test-mode keys before adding the rest — a live key here means
      dev checkouts create real subscriptions and real charges.
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
