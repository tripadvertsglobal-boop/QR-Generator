import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { log } from "@/lib/log";

// POST /api/v1/billing/portal — a Stripe Billing Portal session, where the
// customer updates their card, switches plan, downloads invoices, or cancels.
// Returns { url }.
//
// This is why there is no cancel/change-plan endpoint of our own: the portal is
// the whole billing UI, and every change it makes comes back through the
// webhook as a subscription event.
export const POST = withAuth(
  async (request, auth) => {
    const { data: profile } = await auth.db
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("id", auth.userId)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account for this user" }, { status: 404 });
    }

    try {
      const session = await stripe().billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account`,
      });
      return NextResponse.json({ url: session.url });
    } catch (error) {
      log("error", "stripe_portal_failed", {
        userId: auth.userId,
        message: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ error: "Could not open billing portal" }, { status: 502 });
    }
  },
  { jwtOnly: true },
);

export { preflight as OPTIONS } from "@/lib/cors";
