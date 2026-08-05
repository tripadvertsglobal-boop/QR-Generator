#!/usr/bin/env node
/**
 * Create the test-mode twins of the live Pro and Business products.
 *
 * Billing has only ever existed in live mode on a Stripe account that also
 * bills unrelated products, so there has been nowhere to exercise checkout
 * without charging a real card. This mirrors the live catalogue into test mode
 * so the whole flow can be run against `qrgenerator-testing`.
 *
 *   STRIPE_TEST_SECRET_KEY=sk_test_... node scripts/stripe-test-fixtures.mjs
 *
 * Idempotent: products are looked up by `metadata.plan` first, and an existing
 * product with a matching active recurring price is reused rather than
 * duplicated, so re-running prints the same ids.
 *
 * Refuses to run with a live key. Creating these in live mode would put a
 * second, unsold Pro product in the customer-facing catalogue.
 */

const API = "https://api.stripe.com/v1";
const key = process.env.STRIPE_TEST_SECRET_KEY;

if (!key) {
  console.error("STRIPE_TEST_SECRET_KEY is not set.");
  console.error("Get it from https://dashboard.stripe.com/test/apikeys (Test mode toggle on).");
  process.exit(1);
}
if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
  console.error(`Refusing to run: ${key.slice(0, 8)}… is not a test-mode key.`);
  process.exit(1);
}

// Mirrors the live catalogue: prod_Uz0fVUBejHWDNQ / prod_Uz0fB6bmFWXHMm.
// Amounts are in cents, matching /pricing.
const CATALOGUE = [
  {
    plan: "pro",
    name: "QRStudio Builder Pro",
    description:
      "Unlimited dynamic QR codes, full analytics with geography, unlimited folders & tags, API access & webhooks, bulk create & CSV export, archive & restore.",
    statement_descriptor: "QRSTUDIO PRO",
    amount: 1900,
    env: "STRIPE_PRICE_PRO",
  },
  {
    plan: "business",
    name: "QRStudio Builder Business",
    description:
      "Everything in Pro, plus 10x higher API rate limits, priority support, and onboarding assistance.",
    statement_descriptor: "QRSTUDIO BUSINESS",
    amount: 4900,
    env: "STRIPE_PRICE_BUSINESS",
  },
];

async function stripe(method, path, params) {
  const body = params ? new URLSearchParams(params).toString() : undefined;
  const res = await fetch(`${API}${path}${method === "GET" && body ? `?${body}` : ""}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? body : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${json.error?.message}`);
  return json;
}

/** The existing test-mode product for this plan, or null. */
async function findProduct(plan) {
  const { data } = await stripe("GET", "/products/search", {
    query: `active:'true' AND metadata['plan']:'${plan}'`,
  });
  return data[0] ?? null;
}

/** An existing active monthly price on `product` at `amount`, or null. */
async function findPrice(product, amount) {
  const { data } = await stripe("GET", "/prices", { product, active: "true", limit: "100" });
  return (
    data.find(
      (p) => p.unit_amount === amount && p.currency === "usd" && p.recurring?.interval === "month",
    ) ?? null
  );
}

const results = [];

for (const item of CATALOGUE) {
  let product = await findProduct(item.plan);
  if (product) {
    console.log(`· reusing product ${product.id} (${item.name})`);
  } else {
    product = await stripe("POST", "/products", {
      name: item.name,
      description: item.description,
      statement_descriptor: item.statement_descriptor,
      "metadata[app]": "qrstudio-builder",
      "metadata[plan]": item.plan,
    });
    console.log(`✓ created product ${product.id} (${item.name})`);
  }

  let price = await findPrice(product.id, item.amount);
  if (price) {
    console.log(`· reusing price   ${price.id} ($${item.amount / 100}/mo)`);
  } else {
    price = await stripe("POST", "/prices", {
      product: product.id,
      unit_amount: String(item.amount),
      currency: "usd",
      "recurring[interval]": "month",
      "metadata[plan]": item.plan,
    });
    // Makes the price the one the Dashboard shows first for this product.
    await stripe("POST", `/products/${product.id}`, { default_price: price.id });
    console.log(`✓ created price   ${price.id} ($${item.amount / 100}/mo)`);
  }

  results.push({ env: item.env, price: price.id });
}

console.log("\nAdd to .env.local (test mode — do not put these in wrangler.jsonc):\n");
console.log(`STRIPE_SECRET_KEY=${key.slice(0, 12)}…   # the key you ran this with`);
for (const { env, price } of results) console.log(`${env}=${price}`);
console.log(`
STRIPE_WEBHOOK_SECRET comes from the CLI listener, not the Dashboard:

  stripe listen --forward-to localhost:3000/api/stripe/webhook

It prints a whsec_… that is valid only while that process runs. Use
\`stripe trigger customer.subscription.updated\` to exercise the receiver, and
card 4242 4242 4242 4242 for a real checkout run.`);
