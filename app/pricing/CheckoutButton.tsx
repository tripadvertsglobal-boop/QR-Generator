"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { checkoutPlan, type CheckoutPlan as PaidPlan } from "@/lib/checkout-intent";

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
  const resuming = checkoutPlan(useSearchParams().get("checkout")) === plan;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      // Signed out — there is no account yet to attach a subscription to. Carry
      // the plan so signup can send them back here to finish.
      if (res.status === 401) {
        router.push(`/signup?plan=${plan}`);
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
  }, [plan, router]);

  // Resume the checkout the visitor started before signing up. The ref guards
  // against firing twice under React's development double-invoke.
  const resumed = useRef(false);
  useEffect(() => {
    if (resuming && !resumed.current) {
      resumed.current = true;
      void startCheckout();
    }
  }, [resuming, startCheckout]);

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={startCheckout}
        disabled={busy}
        className={`w-full rounded-md px-4 py-2.5 text-center text-sm font-medium disabled:opacity-60 ${
          highlighted
            ? "text-[var(--brand-fg)] [background:var(--brand)] hover:[background:var(--brand-hover)]"
            : "border border-border hover:border-border-strong"
        }`}
      >
        {busy ? "Starting checkout…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-xs font-semibold text-accent-700">
          {error}
        </p>
      )}
    </div>
  );
}
