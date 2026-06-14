// Sentry init for the Edge runtime (middleware + the /r/[slug] redirect). Loaded
// by instrumentation.ts only when SENTRY_DSN is set.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? "development",
  tracesSampleRate: 0,
});
