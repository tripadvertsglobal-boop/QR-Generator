import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { periodEnd, planForSubscription, stripe } from "@/lib/stripe";
import { log } from "@/lib/log";

/**
 * POST /api/stripe/webhook — the only writer of `user_profiles.plan`.
 *
 * Deliberately outside /api/v1: it is not part of the documented public API, it
 * has no CORS surface, and it authenticates by signature rather than by session
 * or API key, so `withAuth` would be actively wrong here. `middleware.ts`
 * already skips /api/*, so no Supabase session work runs ahead of it.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!secret) {
    // Fail closed. Without the secret every payload is unverifiable, and
    // accepting one would let anyone who can reach this URL grant themselves a
    // plan by POSTing a subscription event.
    log("error", "stripe_webhook_no_secret", {});
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Raw body — the signature is computed over the exact bytes Stripe sent, so
  // this must not be parsed and re-serialized first.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    // Both the async variant *and* the explicit crypto provider are required,
    // for the same reason `lib/stripe.ts` passes an explicit `httpClient`: Next
    // bundles this route's dependencies with Node export conditions at build
    // time, so the SDK's Node build is what actually runs on workerd. That
    // build's default provider is `NodeCryptoProvider` (`node:crypto`) on the
    // async path too, so `constructEventAsync` alone does not select WebCrypto
    // the way it would on the Workers build. Passing the provider explicitly
    // removes the assumption rather than relying on `node:crypto` being
    // polyfilled — the same assumption that hung checkout for 80s.
    // `undefined` tolerance keeps the SDK default (5 minutes).
    event = await stripe().webhooks.constructEventAsync(
      payload,
      signature,
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    log("warn", "stripe_webhook_bad_signature", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // One handler for all three: a deletion arrives with status 'canceled',
      // which planForSubscription already resolves to `free`.
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applySubscription(event.data.object);
        break;
      default:
        // Everything else is acknowledged and ignored. Returning non-2xx would
        // make Stripe retry an event we will never act on.
        break;
    }
  } catch (error) {
    // 500 so Stripe retries — a dropped event means an account is stuck on the
    // wrong plan, which is worse than a duplicate delivery (the write is
    // idempotent: it sets absolute values, never increments).
    log("error", "stripe_webhook_failed", {
      eventId: event.id,
      type: event.type,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function applySubscription(delivered: Stripe.Subscription): Promise<void> {
  // Re-fetch rather than trust the payload. Stripe does not guarantee delivery
  // order, so an older `updated` can arrive after a newer one — applying it
  // would leave a customer on the wrong plan until the next event happened to
  // correct it. The event is used only for the id; the live object decides.
  // A failure here throws, which 500s and lets Stripe retry.
  const subscription = await stripe().subscriptions.retrieve(delivered.id);

  const plan = planForSubscription(subscription);
  if (plan === null) {
    // A subscription for some other product on this Stripe account. Not ours to
    // act on, and writing `free` here would downgrade a paying customer.
    log("info", "stripe_webhook_foreign_subscription", { subscriptionId: subscription.id });
    return;
  }

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  // Set at checkout time, so it is present even if this event overtakes
  // checkout.session.completed. Falls back to the customer id, which the
  // checkout route persists before redirecting.
  const userId = subscription.metadata.user_id;

  const patch = {
    plan,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    plan_period_end: periodEnd(subscription),
  };

  const db = createServiceClient();
  const query = db.from("user_profiles").update(patch);
  const { data, error } = await (userId
    ? query.eq("id", userId)
    : query.eq("stripe_customer_id", customerId)
  ).select("id");

  if (error) throw new Error(error.message);

  if (!data?.length) {
    // No matching account. Most likely a customer of another product on this
    // Stripe account, so this is not retried — throwing would loop until
    // Stripe gave up days later.
    log("warn", "stripe_webhook_no_account", {
      subscriptionId: subscription.id,
      customerId,
      userId: userId ?? null,
    });
    return;
  }

  log("info", "stripe_plan_applied", {
    userId: data[0].id,
    plan,
    status: subscription.status,
  });
}
