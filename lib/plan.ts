import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Plan tiers. Billing does not exist yet: every account starts on `free` and an
 * operator upgrades one by setting `user_profiles.plan` directly (the column is
 * not writable by the account itself — see migration 00017). When Stripe lands
 * it writes that same column and nothing here has to change.
 *
 * These limits are the ones advertised on /pricing, so the marketing page and
 * the API agree. Anything not enforceable in code (support response times) is
 * deliberately absent.
 */
export type Plan = "free" | "pro" | "business";

export type PlanLimits = {
  /** Infinity = unlimited. */
  maxQrCodes: number;
  maxFolders: number;
  /** API keys + webhooks. */
  apiAccess: boolean;
  /** Bulk create and CSV export. GDPR export is never gated. */
  bulkOperations: boolean;
  /** Country breakdown on the QR detail page. */
  geoAnalytics: boolean;
  /**
   * Archive and restore. Deleting is NOT gated — every plan can delete its own
   * codes, so a Free account is never stuck with a code it cannot get rid of.
   * Restore is gated with archiving because they are one feature; the practical
   * effect is that a Pro account which archived codes and later dropped to Free
   * can delete them but not bring them back.
   */
  archiving: boolean;
  /** Default rate_limit stamped on a newly minted API key. */
  defaultKeyRateLimit: number;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxQrCodes: 3,
    maxFolders: 1,
    apiAccess: false,
    bulkOperations: false,
    geoAnalytics: false,
    archiving: false,
    defaultKeyRateLimit: 0,
  },
  pro: {
    maxQrCodes: Infinity,
    maxFolders: Infinity,
    apiAccess: true,
    bulkOperations: true,
    geoAnalytics: true,
    archiving: true,
    defaultKeyRateLimit: 100,
  },
  business: {
    maxQrCodes: Infinity,
    maxFolders: Infinity,
    apiAccess: true,
    bulkOperations: true,
    geoAnalytics: true,
    archiving: true,
    defaultKeyRateLimit: 1000,
  },
};

export function isPlan(value: unknown): value is Plan {
  return value === "free" || value === "pro" || value === "business";
}

/** Unknown / missing plan resolves to `free` — fail closed, never fail open. */
export function limitsFor(plan: unknown): PlanLimits {
  return PLAN_LIMITS[isPlan(plan) ? plan : "free"];
}

export async function getPlan(db: SupabaseClient, userId: string): Promise<Plan> {
  const { data } = await db.from("user_profiles").select("plan").eq("id", userId).maybeSingle();
  return isPlan(data?.plan) ? data.plan : "free";
}

export async function getPlanLimits(db: SupabaseClient, userId: string): Promise<PlanLimits> {
  return limitsFor(await getPlan(db, userId));
}

/** 402 body copy — one place, so every gated endpoint says the same thing. */
export function upgradeRequired(feature: string): string {
  return `${feature} is not available on the Free plan. Upgrade to Pro to continue.`;
}

export function limitReached(what: string, limit: number): string {
  return `Free plan limit reached (${limit} ${what}). Upgrade to Pro for unlimited ${what}.`;
}
