import { siteConfig } from "../site.config";

/**
 * The production configuration contract, asserted in one place.
 *
 * Without this, a missing secret fails late and narrowly: no LINK_UNLOCK_SECRET
 * means every /r/<slug> redirect 500s at runtime while the build stays green,
 * and no CRON_SECRET means the retention job quietly 503s forever. Checking the
 * whole contract up front turns those into one loud, obvious failure.
 *
 * Pure and dependency-free so it can run from next.config.ts at build time.
 */

/** Values in site.config.ts that must be replaced before going live. */
export const PLACEHOLDER_PREFIX = "TODO_";

export function isPlaceholder(value: string): boolean {
  return value.startsWith(PLACEHOLDER_PREFIX);
}

/** Absent in production = a feature is broken, not merely degraded. */
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_REDIRECT_DOMAIN",
  "NEXT_PUBLIC_APP_URL",
  // lib/link-token.ts throws without it -> every redirect 500s.
  "LINK_UNLOCK_SECRET",
  // Without it the cron route fails closed with 503 and audit logs grow forever.
  "CRON_SECRET",
] as const;

/** Absent = the app still works, but a safety net is silently switched off. */
const RECOMMENDED: { name: string; consequence: string }[] = [
  { name: "KV_REST_API_URL", consequence: "rate limiting and the slug cache are disabled" },
  { name: "KV_REST_API_TOKEN", consequence: "rate limiting and the slug cache are disabled" },
  { name: "SAFE_BROWSING_API_KEY", consequence: "destination URL screening is disabled" },
  { name: "SENTRY_DSN", consequence: "server errors are not reported" },
  { name: "NEXT_PUBLIC_SENTRY_DSN", consequence: "browser errors are not reported" },
  { name: "ALLOWED_ORIGINS", consequence: "no cross-origin caller can use the public API" },
];

export type ConfigReport = { errors: string[]; warnings: string[] };

export function checkProductionConfig(env: Record<string, string | undefined>): ConfigReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const name of REQUIRED) {
    if (!env[name]?.trim()) errors.push(`${name} is required in production but is not set`);
  }

  for (const { name, consequence } of RECOMMENDED) {
    if (!env[name]?.trim()) warnings.push(`${name} is not set — ${consequence}`);
  }

  // Placeholder company details must never reach a real user: they render in
  // the footer and are named as the contact of record in the Terms and the
  // Privacy Policy.
  for (const [field, value] of Object.entries(siteConfig.contact)) {
    if (isPlaceholder(value)) {
      errors.push(`siteConfig.contact.${field} is still the placeholder "${value}"`);
    }
  }

  return { errors, warnings };
}

/** Throws on any error; returns the warnings for the caller to log. */
export function assertProductionConfig(env: Record<string, string | undefined>): string[] {
  const { errors, warnings } = checkProductionConfig(env);
  if (errors.length > 0) {
    throw new Error(
      `Production configuration is incomplete:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
    );
  }
  return warnings;
}
