import { describe, it, expect, beforeEach, vi } from "vitest";
import { setDb, setServiceDb } from "../helpers/route";
import { jsonRequest, ctx } from "../helpers/request";

// Only the Stripe client is faked. priceIdFor stays real so a missing price env
// would surface here rather than being asserted into existence.
const { customersCreate, sessionsCreate } = vi.hoisted(() => ({
  customersCreate: vi.fn(),
  sessionsCreate: vi.fn(),
}));

vi.mock("@/lib/stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe")>()),
  stripe: () => ({
    customers: { create: customersCreate },
    checkout: { sessions: { create: sessionsCreate } },
  }),
}));

import { POST } from "@/app/api/v1/billing/checkout/route";

type Profile = { plan: string; stripe_customer_id: string | null };

/**
 * Install a caller whose profile row is `profile`, or a failed profile read
 * when `error` is given. createDbMock only short-circuits `select("plan")`
 * exactly, and this route selects "plan, stripe_customer_id", so the row comes
 * from the queue as normal.
 *
 * getUser is patched onto the mock here rather than in the shared helper: this
 * is the only route that reads the caller's email, and widening the helper
 * would change the surface every other api test sees.
 */
function setCaller(profile: Profile | null, error: unknown = null) {
  // The service client writes stripe_customer_id back after a customer is
  // created; without it that path throws and every failure looks like a 502.
  setServiceDb([]);
  const mock = setDb([{ data: profile, error }]);
  Object.assign(mock.db.auth, {
    getUser: async () => ({ data: { user: { email: "buyer@test.local" } } }),
  });
  return mock;
}

function checkout(plan = "pro") {
  return POST(jsonRequest("POST", { plan }), ctx());
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_PRICE_PRO", "price_pro");
  vi.stubEnv("STRIPE_PRICE_BUSINESS", "price_business");
  sessionsCreate.mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.test/cs_1" });
  customersCreate.mockResolvedValue({ id: "cus_new" });
});

describe("POST /api/v1/billing/checkout — comped accounts", () => {
  it("refuses to open Checkout for a paid plan with no Stripe customer", async () => {
    setCaller({ plan: "business", stripe_customer_id: null });
    const res = await checkout("pro");
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/managed for you/i);
  });

  // The whole point of the guard: this is the write that would hand a
  // hand-granted plan over to Stripe's webhook.
  it("creates no Stripe customer for a comped account", async () => {
    setCaller({ plan: "business", stripe_customer_id: null });
    await checkout("pro");
    expect(customersCreate).not.toHaveBeenCalled();
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("names the comp rather than the billing portal when the tier also matches", async () => {
    // A comped Business account asking for Business would otherwise hit the
    // "already subscribed, use the portal" 409 — advice it cannot follow.
    setCaller({ plan: "business", stripe_customer_id: null });
    expect((await (await checkout("business")).json()).error).toMatch(/managed for you/i);
  });

  it("still lets a genuinely paying account through to the portal message", async () => {
    setCaller({ plan: "pro", stripe_customer_id: "cus_existing" });
    const res = await checkout("pro");
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/billing portal/i);
  });
});

describe("POST /api/v1/billing/checkout — fail closed", () => {
  it("refuses when the profile read errors", async () => {
    setCaller(null, { message: "connection reset" });
    const res = await checkout();
    expect(res.status).toBe(503);
    expect(customersCreate).not.toHaveBeenCalled();
  });

  it("refuses when the caller has no profile row", async () => {
    setCaller(null);
    const res = await checkout();
    expect(res.status).toBe(503);
    expect(customersCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/billing/checkout — normal purchase", () => {
  it("opens Checkout for a free account and reuses no customer", async () => {
    setCaller({ plan: "free", stripe_customer_id: null });
    const res = await checkout("pro");
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe("https://checkout.stripe.test/cs_1");
    expect(customersCreate).toHaveBeenCalled();
  });

  it("upgrades a paying Pro account to Business on its existing customer", async () => {
    setCaller({ plan: "pro", stripe_customer_id: "cus_existing" });
    const res = await checkout("business");
    expect(res.status).toBe(200);
    expect(customersCreate).not.toHaveBeenCalled();
    expect(sessionsCreate.mock.calls[0][0]).toMatchObject({ customer: "cus_existing" });
  });

  it("rejects an unknown plan before touching the database", async () => {
    setCaller({ plan: "free", stripe_customer_id: null });
    const res = await POST(jsonRequest("POST", { plan: "enterprise" }), ctx());
    expect(res.status).toBe(400);
  });
});
