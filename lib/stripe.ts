import Stripe from "stripe";
import type { Plan } from "./plan";

/**
 * Stripe wiring. The only file that knows how a Stripe object maps onto a
 * `user_profiles.plan` value — the webhook and the checkout route both go
 * through here so the mapping cannot drift between them.
 *
 * No `apiVersion` is passed: the SDK pins the version its own types were
 * generated from (2026-07-29.dahlia for stripe@22), and hardcoding a different
 * string here would let the types lie about the JSON we actually receive.
 */

export const PAID_PLANS = ["pro", "business"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

let client: Stripe | undefined;

/**
 * Lazy so that importing this module never throws at build time — the key is
 * only needed when a billing route actually runs. Cached per isolate.
 *
 * `httpClient` is passed explicitly and must stay that way. The SDK ships a
 * Workers build behind a `workerd` export condition, but we never get it: Next
 * bundles Route Handler dependencies at build time, so `stripe` is resolved
 * with Node conditions during `next build`, long before OpenNext or workerd is
 * involved. That bundles the Node build, whose default client issues requests
 * through `node:https` — which hangs on workerd rather than erroring, so every
 * call died at the SDK's 80s timeout with "Request aborted due to timeout being
 * reached (80000ms)" and no request ever reached Stripe.
 */
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return (client ??= new Stripe(key, { httpClient: Stripe.createFetchHttpClient() }));
}

const PRICE_ENV: Record<PaidPlan, string> = {
  pro: "STRIPE_PRICE_PRO",
  business: "STRIPE_PRICE_BUSINESS",
};

export function priceIdFor(plan: PaidPlan): string {
  const name = PRICE_ENV[plan];
  const id = process.env[name];
  if (!id) throw new Error(`${name} is not set`);
  return id;
}

/**
 * Reverse of `priceIdFor`. Returns null for a price this deployment does not
 * sell, so an event from another product on the same Stripe account (this
 * account also bills unrelated hardware procurement) can never grant a plan.
 */
export function planForPrice(priceId: string | null | undefined): PaidPlan | null {
  // Without this guard an unset price env var would compare undefined ===
  // undefined and match every unknown price.
  if (!priceId) return null;
  return PAID_PLANS.find((plan) => process.env[PRICE_ENV[plan]] === priceId) ?? null;
}

/**
 * Subscription statuses that keep paid features switched on.
 *
 * `past_due` is deliberately entitled: Stripe retries a failed charge for days,
 * and revoking API access the moment a card expires punishes a paying customer
 * for a bank's decision. Access ends when Stripe gives up and moves the
 * subscription to `canceled` or `unpaid`. `paused` is absent on purpose.
 */
const ENTITLED: ReadonlySet<string> = new Set(["active", "trialing", "past_due"]);

/**
 * The plan a subscription entitles its owner to, or `null` if the subscription
 * is not for something this app sells.
 *
 * The null case matters: this Stripe account also bills unrelated products, so
 * a `customer.subscription.*` event can legitimately be about something else.
 * Collapsing that to `free` would let an unrelated subscription downgrade a
 * paying QRStudio account — the caller must ignore null, not write it.
 */
export function planForSubscription(subscription: Stripe.Subscription): Plan | null {
  const sold = planForPrice(subscription.items.data[0]?.price.id);
  if (!sold) return null;
  return ENTITLED.has(subscription.status) ? sold : "free";
}

/**
 * End of the paid period, as an ISO string.
 *
 * This lives on the subscription *item*, not the subscription — it moved there
 * in API version 2025-03-31.basil and `subscription.current_period_end` no
 * longer exists on the type at all.
 */
export function periodEnd(subscription: Stripe.Subscription): string | null {
  const seconds = subscription.items.data[0]?.current_period_end;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}
