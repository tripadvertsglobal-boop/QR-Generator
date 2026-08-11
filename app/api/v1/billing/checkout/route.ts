import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { PAID_PLANS, priceIdFor, stripe } from "@/lib/stripe";
import { logAudit } from "@/lib/audit";
import { log } from "@/lib/log";

const checkoutSchema = z.object({ plan: z.enum(PAID_PLANS) });

// POST /api/v1/billing/checkout — start a Stripe Checkout session for a paid
// plan. Returns { url } for the caller to redirect to.
//
// jwtOnly: buying a subscription is a session action. Allowing it under an API
// key would let a leaked key move money on the owner's saved card.
export const POST = withAuth(
  async (request, auth) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = checkoutSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }
    const { plan } = parsed.data;

    const { data: profile } = await auth.db
      .from("user_profiles")
      .select("plan, stripe_customer_id")
      .eq("id", auth.userId)
      .maybeSingle();

    if (profile?.plan === plan) {
      // Not an error worth a Stripe round trip — the UI should have sent them
      // to the billing portal instead.
      return NextResponse.json(
        { error: `Already subscribed to ${plan}. Use the billing portal to change plans.` },
        { status: 409 },
      );
    }

    const {
      data: { user },
    } = await auth.db.auth.getUser();

    try {
      const client = stripe();
      let customerId: string | undefined = profile?.stripe_customer_id ?? undefined;

      // Reuse the customer across checkouts so a second purchase does not
      // create a duplicate customer with a split payment history.
      if (!customerId) {
        const customer = await client.customers.create({
          email: user?.email,
          metadata: { user_id: auth.userId },
        });
        customerId = customer.id;

        // Service role: 00017 revoked UPDATE on user_profiles from
        // `authenticated`, and 00021 added this column without re-granting it.
        // Persisted before Checkout so an abandoned session still leaves us
        // with one reusable customer rather than an orphan.
        await createServiceClient()
          .from("user_profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", auth.userId);
      }

      // Redirect targets come from configured app URL, never from the request
      // origin or a caller-supplied value — that would be an open redirect
      // wearing a Stripe badge.
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;

      const session = await client.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceIdFor(plan), quantity: 1 }],
        success_url: `${appUrl}/dashboard/account?checkout=success`,
        cancel_url: `${appUrl}/pricing?checkout=cancelled`,
        client_reference_id: auth.userId,
        // The webhook resolves the account from this first and falls back to
        // the customer id, so a subscription event is attributable even if it
        // arrives before checkout.session.completed.
        subscription_data: { metadata: { user_id: auth.userId, plan } },
      });

      if (!session.url) {
        log("error", "stripe_checkout_no_url", { sessionId: session.id });
        return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
      }

      logAudit({
        userId: auth.userId,
        action: "billing.checkout",
        resourceType: "subscription",
        resourceId: session.id,
        newValue: { plan },
        request,
      });

      return NextResponse.json({ url: session.url });
    } catch (error) {
      // Stripe errors carry account/config detail that should not reach a
      // browser (which price is missing, which key is bad).
      log("error", "stripe_checkout_failed", {
        userId: auth.userId,
        plan,
        message: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
    }
  },
  { jwtOnly: true },
);

export { preflight as OPTIONS } from "@/lib/cors";
