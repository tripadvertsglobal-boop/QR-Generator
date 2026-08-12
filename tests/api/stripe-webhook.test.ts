import { describe, it, expect, beforeEach, vi } from "vitest";
import { setServiceDb } from "../helpers/route";

// Only the client is faked. planForSubscription/periodEnd stay real so the
// price -> plan mapping is exercised rather than asserted twice.
const { constructEventAsync, retrieve } = vi.hoisted(() => ({
  constructEventAsync: vi.fn(),
  retrieve: vi.fn(),
}));

vi.mock("@/lib/stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe")>()),
  stripe: () => ({ webhooks: { constructEventAsync }, subscriptions: { retrieve } }),
}));

import { POST } from "@/app/api/stripe/webhook/route";

const url = "http://test.local/api/stripe/webhook";
const PERIOD_END = 1800000000; // 2027-01-15T08:00:00.000Z

type Sub = Record<string, unknown>;

function subscription(overrides: Sub = {}): Sub {
  return {
    id: "sub_123",
    status: "active",
    customer: "cus_123",
    metadata: { user_id: "user-1" },
    items: { data: [{ price: { id: "price_pro" }, current_period_end: PERIOD_END }] },
    ...overrides,
  };
}

/**
 * Deliver an event. `current` is what Stripe returns when the handler asks for
 * the subscription's live state — it differs from the payload only when a test
 * is about out-of-order delivery.
 */
function deliver(sub: Sub, type = "customer.subscription.updated", current: Sub = sub) {
  constructEventAsync.mockResolvedValue({ id: "evt_1", type, data: { object: sub } });
  retrieve.mockResolvedValue(current);
  return POST(new Request(url, { method: "POST", body: "{}", headers: { "stripe-signature": "t=1,v1=x" } }));
}

/** The patch handed to user_profiles.update(), or undefined if there was none. */
function updatePatch(calls: { table?: string; method: string; args: unknown[] }[]) {
  return calls.find((c) => c.table === "user_profiles" && c.method === "update")?.args[0] as
    | Record<string, unknown>
    | undefined;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  vi.stubEnv("STRIPE_PRICE_PRO", "price_pro");
  vi.stubEnv("STRIPE_PRICE_BUSINESS", "price_business");
});

describe("POST /api/stripe/webhook — rejection", () => {
  it("fails closed with 500 when the signing secret is unset", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    setServiceDb([]);
    const res = await POST(new Request(url, { method: "POST", body: "{}" }));
    expect(res.status).toBe(500);
    expect(constructEventAsync).not.toHaveBeenCalled();
  });

  it("rejects a request with no signature header", async () => {
    setServiceDb([]);
    const res = await POST(new Request(url, { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
  });

  it("rejects a payload whose signature does not verify", async () => {
    setServiceDb([]);
    constructEventAsync.mockRejectedValue(new Error("no signatures found"));
    const res = await POST(
      new Request(url, { method: "POST", body: "{}", headers: { "stripe-signature": "bad" } }),
    );
    expect(res.status).toBe(400);
  });

  it("verifies against the raw body, not a reparsed one", async () => {
    setServiceDb([{ data: [{ id: "user-1" }], error: null }]);
    const body = '{"id":"evt_1","spacing":  "preserved"}';
    constructEventAsync.mockResolvedValue({ id: "evt_1", type: "invoice.paid", data: { object: {} } });
    await POST(new Request(url, { method: "POST", body, headers: { "stripe-signature": "t=1,v1=x" } }));
    // Only the first three args are this test's concern; the trailing tolerance
    // and crypto-provider args are runtime wiring, not raw-body handling.
    expect(constructEventAsync.mock.calls[0].slice(0, 3)).toEqual([body, "t=1,v1=x", "whsec_test"]);
  });
});

describe("POST /api/stripe/webhook — plan application", () => {
  it("grants the tier the price maps to", async () => {
    const { calls } = setServiceDb([{ data: [{ id: "user-1" }], error: null }]);
    const res = await deliver(subscription(), "customer.subscription.created");
    expect(res.status).toBe(200);
    expect(updatePatch(calls)).toEqual({
      plan: "pro",
      stripe_subscription_id: "sub_123",
      subscription_status: "active",
      plan_period_end: new Date(PERIOD_END * 1000).toISOString(),
    });
  });

  it("keeps access while a payment is being retried", async () => {
    const { calls } = setServiceDb([{ data: [{ id: "user-1" }], error: null }]);
    await deliver(subscription({ status: "past_due" }));
    expect(updatePatch(calls)?.plan).toBe("pro");
  });

  it("drops to free when the subscription is deleted", async () => {
    const { calls } = setServiceDb([{ data: [{ id: "user-1" }], error: null }]);
    await deliver(
      subscription({ status: "canceled" }),
      "customer.subscription.deleted",
    );
    expect(updatePatch(calls)?.plan).toBe("free");
  });

  it("matches on the customer id when the subscription carries no user_id", async () => {
    const { calls } = setServiceDb([{ data: [{ id: "user-1" }], error: null }]);
    await deliver(subscription({ metadata: {} }));
    const eq = calls.find((c) => c.method === "eq");
    expect(eq?.args).toEqual(["stripe_customer_id", "cus_123"]);
  });

  it("ignores a subscription for a product this app does not sell", async () => {
    const { calls } = setServiceDb([]);
    const res = await deliver(
      subscription({ items: { data: [{ price: { id: "price_medical_books" }, current_period_end: PERIOD_END }] } }),
    );
    expect(res.status).toBe(200);
    expect(updatePatch(calls)).toBeUndefined();
  });

  it("acknowledges an event type it does not handle", async () => {
    setServiceDb([]);
    constructEventAsync.mockResolvedValue({ id: "evt_1", type: "invoice.paid", data: { object: {} } });
    const res = await POST(
      new Request(url, { method: "POST", body: "{}", headers: { "stripe-signature": "t=1,v1=x" } }),
    );
    expect(res.status).toBe(200);
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("does not retry when no account matches the customer", async () => {
    setServiceDb([{ data: [], error: null }]);
    const res = await deliver(subscription());
    // 200, not 500: retrying a customer that will never exist here loops for days.
    expect(res.status).toBe(200);
  });

  it("asks Stripe to retry when the database write fails", async () => {
    setServiceDb([{ data: null, error: { message: "connection reset" } }]);
    const res = await deliver(subscription());
    expect(res.status).toBe(500);
  });
});

describe("POST /api/stripe/webhook — out-of-order delivery", () => {
  it("applies the subscription's live state, not a stale payload", async () => {
    const { calls } = setServiceDb([{ data: [{ id: "user-1" }], error: null }]);
    // Stripe does not guarantee ordering: an older `updated` can arrive after a
    // newer one. Trusting the payload would downgrade a customer who is in fact
    // still active.
    await deliver(
      subscription({ status: "canceled" }),
      "customer.subscription.updated",
      subscription({ status: "active" }),
    );
    expect(retrieve).toHaveBeenCalledWith("sub_123");
    expect(updatePatch(calls)?.plan).toBe("pro");
  });

  it("still cancels when the live state agrees the subscription is over", async () => {
    const { calls } = setServiceDb([{ data: [{ id: "user-1" }], error: null }]);
    await deliver(
      subscription({ status: "active" }),
      "customer.subscription.deleted",
      subscription({ status: "canceled" }),
    );
    expect(updatePatch(calls)?.plan).toBe("free");
  });
});
