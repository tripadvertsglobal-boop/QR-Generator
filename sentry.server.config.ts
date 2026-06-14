// Sentry init for the Node.js (serverless) runtime. Loaded by instrumentation.ts
// only when SENTRY_DSN is set, so it's a no-op until you add the DSN in Vercel.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? "development",
  tracesSampleRate: 0,
});
