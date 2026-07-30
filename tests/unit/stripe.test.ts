import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";
import { planForPrice, planForSubscription, periodEnd } from "@/lib/stripe";

const PRO = "price_pro_test";
const BUSINESS = "price_business_test";

// A subscription carrying one item, which is the only shape these plans sell.
function subscription(priceId: string, status: string, currentPeriodEnd = 1800000000) {
  return {
    id: "sub_test",
    status,
    items: { data: [{ price: { id: priceId }, current_period_end: currentPeriodEnd }] },
  } as unknown as Stripe.Subscription;
}

beforeEach(() => {
  process.env.STRIPE_PRICE_PRO = PRO;
  process.env.STRIPE_PRICE_BUSINESS = BUSINESS;
});

afterEach(() => {
  delete process.env.STRIPE_PRICE_PRO;
  delete process.env.STRIPE_PRICE_BUSINESS;
});

describe("planForPrice", () => {
  it("maps each configured price to its tier", () => {
    expect(planForPrice(PRO)).toBe("pro");
    expect(planForPrice(BUSINESS)).toBe("business");
  });

  it("returns null for a price this deployment does not sell", () => {
    expect(planForPrice("price_someone_elses_product")).toBeNull();
  });

  it("returns null for a missing price rather than matching an unset env var", () => {
    // The guard that matters: without it, `undefined === undefined` would make
    // every unknown price resolve to whichever tier is unconfigured.
    delete process.env.STRIPE_PRICE_PRO;
    expect(planForPrice(undefined)).toBeNull();
    expect(planForPrice(null)).toBeNull();
    expect(planForPrice("")).toBeNull();
  });
});

describe("planForSubscription", () => {
  it("grants the tier while the subscription is active or trialing", () => {
    expect(planForSubscription(subscription(PRO, "active"))).toBe("pro");
    expect(planForSubscription(subscription(BUSINESS, "active"))).toBe("business");
    expect(planForSubscription(subscription(PRO, "trialing"))).toBe("pro");
  });

  it("keeps access while a payment is being retried", () => {
    // past_due means Stripe is still retrying; cutting API access here would
    // punish a paying customer for an expired card.
    expect(planForSubscription(subscription(PRO, "past_due"))).toBe("pro");
  });

  it("drops to free once the subscription is really over", () => {
    for (const status of ["canceled", "unpaid", "incomplete_expired", "paused"]) {
      expect(planForSubscription(subscription(PRO, status)), status).toBe("free");
    }
  });

  it("ignores a subscription for a product this app does not sell", () => {
    // This Stripe account also bills unrelated products. Returning "free" here
    // instead of null would let one of those downgrade a paying QRStudio user.
    expect(planForSubscription(subscription("price_rtx_5060ti", "active"))).toBeNull();
    expect(planForSubscription(subscription("price_rtx_5060ti", "canceled"))).toBeNull();
  });
});

describe("periodEnd", () => {
  it("reads the item-level period end and returns ISO", () => {
    // current_period_end lives on the subscription item, not the subscription.
    expect(periodEnd(subscription(PRO, "active", 1800000000))).toBe(
      new Date(1800000000 * 1000).toISOString(),
    );
  });

  it("returns null when the subscription has no items", () => {
    const empty = { id: "sub_x", status: "active", items: { data: [] } } as unknown as Stripe.Subscription;
    expect(periodEnd(empty)).toBeNull();
  });
});
