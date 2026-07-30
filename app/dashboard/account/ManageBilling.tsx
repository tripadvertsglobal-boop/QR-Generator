"use client";

import { useState } from "react";
import Button from "@/app/_components/ui/Button";

// Opens the Stripe Billing Portal, where the customer changes plan, updates
// their card, downloads invoices, or cancels. Rendered only for accounts that
// have a Stripe customer, so a 404 from the route means state drifted.
export default function ManageBilling() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/billing/portal", { method: "POST" });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setError(body.error ?? "Could not open the billing portal. Please try again.");
        setBusy(false);
        return;
      }
      // Portal is on Stripe's origin. `busy` stays set — the page is leaving.
      window.location.href = body.url;
    } catch {
      setError("Could not reach the billing portal. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" onClick={openPortal} loading={busy} className="self-start">
        Manage billing
      </Button>
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
