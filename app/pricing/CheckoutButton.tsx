"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The plan union is inlined rather than imported from lib/stripe so that no
// import path exists from a client component into the Stripe SDK.
type PaidPlan = "pro" | "business";

// CTA for a paid plan on /pricing. Styling mirrors the <Link> CTA next to it in
// page.tsx — this page is marketing-shell styled and does not use ui/Button.
export default function CheckoutButton({
  plan,
  label,
  highlighted,
}: {
  plan: PaidPlan;
  label: string;
  highlighted: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      // Signed out — there is no account yet to attach a subscription to.
      if (res.status === 401) {
        router.push("/signup");
        return;
      }

      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setError(body.error ?? "Could not start checkout. Please try again.");
        setBusy(false);
        return;
      }

      // Full navigation, not router.push: Checkout is on Stripe's origin.
      // `busy` is intentionally left set — the page is going away.
      window.location.href = body.url;
    } catch {
      setError("Could not reach checkout. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={startCheckout}
        disabled={busy}
        className={`w-full rounded-md px-4 py-2.5 text-center text-sm font-medium disabled:opacity-60 ${
          highlighted
            ? "text-[var(--brand-fg)] [background:var(--brand)] hover:[background:var(--brand-hover)]"
            : "border border-black/15 hover:border-black/40"
        }`}
      >
        {busy ? "Starting checkout…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
