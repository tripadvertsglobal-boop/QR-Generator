/**
 * No-op stand-in for `@sentry/nextjs`, aliased in by next.config.ts when no
 * SENTRY_DSN is configured.
 *
 * Why this exists: the SDK is ~3 MB of the server bundle, and the Worker has a
 * hard compressed-size limit. Every call site already refuses to do anything
 * without a DSN (see lib/log.ts and instrumentation.ts), so on a DSN-less build
 * that weight is bundled purely to never run. Aliasing it out is the same
 * decision next.config.ts already makes when it skips withSentryConfig.
 *
 * Set SENTRY_DSN and the real SDK is bundled again — but note the Worker will
 * then be back over the free plan's size limit, so that change wants the paid
 * plan alongside it.
 *
 * Keep this surface in sync with the Sentry APIs the app actually calls.
 */

export function init(): void {}

export function captureException(): void {}

export function captureRequestError(): void {}

export function captureRouterTransitionStart(): void {}
