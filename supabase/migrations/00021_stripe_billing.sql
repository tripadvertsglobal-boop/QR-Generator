-- Stripe billing state.
--
-- 00017 already made `plan` the single switch every feature gate reads
-- (lib/plan.ts) and revoked UPDATE on it from `authenticated`, so the Stripe
-- webhook running under the service role is its only writer. These columns
-- record *why* an account sits on the plan it does, which is what makes a
-- support question ("is this person actually paying?") answerable from the
-- database instead of a Dashboard search.
ALTER TABLE public.user_profiles
  -- UNIQUE because two accounts sharing a Stripe customer would make the
  -- webhook's reverse lookup ambiguous and silently upgrade the wrong one.
  -- The implicit unique index is also the lookup index for that path, so no
  -- separate CREATE INDEX is needed.
  ADD COLUMN stripe_customer_id TEXT UNIQUE,
  ADD COLUMN stripe_subscription_id TEXT,
  -- Raw Stripe status ('active', 'past_due', 'canceled', ...). Kept verbatim
  -- rather than collapsed into a boolean: `plan` is the entitlement, this is
  -- the evidence, and past_due needs to be distinguishable from active when
  -- someone asks why a paying account still has access.
  ADD COLUMN subscription_status TEXT,
  -- End of the paid period, from subscription.items.data[].current_period_end.
  -- It is item-level, not subscription-level, as of API 2026-07-29.dahlia.
  ADD COLUMN plan_period_end TIMESTAMPTZ;

-- No GRANT for these columns. 00017 revoked UPDATE wholesale and re-granted
-- only (display_name, avatar_url, timezone); a column added afterwards carries
-- no grant, so `authenticated` cannot write any of them. That is the property
-- that stops an account from PATCHing itself a subscription — do not add them
-- to that GRANT list.
