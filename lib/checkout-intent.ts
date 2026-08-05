/**
 * The "I clicked Start Pro while signed out" intent, carried through signup or
 * login and back to /pricing so the visitor lands where they were going.
 *
 * Deliberately NOT a general `next` redirect parameter. The only thing that has
 * to survive the round trip is which plan to buy, and a closed set of two
 * literals cannot be bent into an open redirect — an attacker-supplied value
 * fails `checkoutPlan` and the user simply lands on the dashboard. A `next`
 * holding an arbitrary path would need origin validation on every read, and
 * getting that wrong is the whole bug class this avoids.
 *
 * The plan literals are duplicated rather than imported from lib/stripe because
 * that module loads the Stripe SDK, which must never reach a client bundle.
 * lib/stripe.ts owns the price mapping; this owns only the URL vocabulary.
 */
export const CHECKOUT_PLANS = ["pro", "business"] as const;
export type CheckoutPlan = (typeof CHECKOUT_PLANS)[number];

/** Narrow an untrusted query value to a plan, or null. */
export function checkoutPlan(value: string | null | undefined): CheckoutPlan | null {
  return CHECKOUT_PLANS.find((plan) => plan === value) ?? null;
}

/** Where to send someone once they are authenticated. */
export function afterAuthPath(plan: CheckoutPlan | null): string {
  return plan ? `/pricing?checkout=${plan}` : "/dashboard";
}
