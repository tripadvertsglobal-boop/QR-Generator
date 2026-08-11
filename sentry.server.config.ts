// Sentry init for the Node.js (serverless) runtime. Loaded by instrumentation.ts
// only when SENTRY_DSN is set, so it's a no-op until you add the DSN in Vercel.
//
// Uses @sentry/node-core/light instead of @sentry/nextjs: the latter resolves
// (via Next's own Node-conditioned build step, ahead of opennextjs-cloudflare's
// workerd-conditioned bundling) to @sentry/node, which statically pulls in
// OpenTelemetry auto-instrumentation for ~25 libraries this app doesn't use
// (Kafka, MySQL, LangChain, etc.) plus import-in-the-middle. That alone was
// ~2.3 MB of the Worker's raw bundle - enough by itself to blow past
// Cloudflare's 3 MiB size limit. The light client drops OpenTelemetry
// entirely (no tracing spans - tracesSampleRate is 0 anyway) but keeps
// captureException and the rest of the reporting API.
import { init } from "@sentry/node-core/light";

init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? "development",
  tracesSampleRate: 0,
});
