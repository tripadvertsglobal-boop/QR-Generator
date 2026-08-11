import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { assertProductionConfig } from "./lib/env";

// Fail the *build* — not the deployed site — when a production deployment is
// missing a required secret or still carries placeholder company details.
// Gated on the platform's own production signal (Vercel's VERCEL_ENV, Cloudflare
// Workers Builds' branch) so local dev and CI (which build with throwaway
// values) are unaffected.
const isProductionBuild =
  process.env.VERCEL_ENV === "production" || process.env.WORKERS_CI_BRANCH === "main";

if (isProductionBuild) {
  for (const warning of assertProductionConfig(process.env)) {
    console.warn(`[config] ${warning}`);
  }
}

// Origin the browser Supabase client talks to (auth REST + realtime wss), needed
// in connect-src so a future enforcing CSP doesn't break login.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();
const supabaseWs = supabaseOrigin.replace(/^http/, "ws");

// Origin the browser Sentry SDK POSTs events to, parsed out of the DSN
// (https://<key>@o<org>.ingest.<region>.sentry.io/<project>). Without it in
// connect-src, promoting the CSP to enforcing silently kills client-side error
// reporting — the one thing that would tell you the CSP broke something.
const sentryOrigin = (() => {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return "";
  try {
    return new URL(dsn).origin;
  } catch {
    return "";
  }
})();

const CSP_REPORT_PATH = "/api/csp-report";
// Reporting-Endpoints takes a URL; make it absolute when the origin is known,
// since a relative value is not reliably accepted.
const cspReportUrl = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}${CSP_REPORT_PATH}`
  : CSP_REPORT_PATH;

// Enforcing headers that are always safe (no legitimate request depends on their
// absence). Clickjacking is covered here by X-Frame-Options + the CSP's
// frame-ancestors.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing in this app uses these APIs; denying them limits the blast radius
  // of any injected script.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // Names the destination referenced by the CSP's `report-to` directive.
  { key: "Reporting-Endpoints", value: `csp-endpoint="${cspReportUrl}"` },
];

// CSP shipped in Report-Only first: it observes violations without breaking the
// app. 'unsafe-inline' covers Next's inline hydration scripts/styles; connect-src
// allows the Supabase browser client.
//
// Violations are posted to CSP_REPORT_PATH, which logs them — without a report
// destination a Report-Only policy is inert and can never be validated. Both
// report-to (current) and report-uri (older browsers) are sent.
// Promote by setting CSP_ENFORCE=1 once the reports come back clean — the
// switch is an env var rather than a code edit so the cutover (and the rollback,
// if something was missed) is a redeploy and not a PR. Note that 'unsafe-inline'
// in script-src limits what enforcement buys until Next's inline scripts are
// moved to a nonce.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs} ${sentryOrigin}`.replace(/\s+/g, " ").trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "report-to csp-endpoint",
  `report-uri ${CSP_REPORT_PATH}`,
].join("; ");

const cspHeader = process.env.CSP_ENFORCE
  ? "Content-Security-Policy"
  : "Content-Security-Policy-Report-Only";

const nextConfig: NextConfig = {
  // Don't advertise the framework.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders, { key: cspHeader, value: csp }],
      },
    ];
  },
};

// Always wrapped, even without a DSN: bundleSizeOptimizations strips
// @sentry/node's unused tracing auto-instrumentation (Kafka, MySQL,
// LangChain, etc. — pulled in by the plain `import * as Sentry` in
// sentry.server.config.ts before opennextjs-cloudflare's workerd-conditioned
// bundling step ever runs), which is what pushed the Worker over Cloudflare's
// 3 MiB size limit. Source-map upload still needs all three org/project/
// authToken; without them the wrapper still instruments the app, it just
// skips the upload.
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Strip the uploaded maps from the client bundle so stack traces resolve
  // in Sentry without shipping sources to users.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  // Tracing is already off (tracesSampleRate: 0 in both sentry.*.config.ts);
  // this drops the auto-instrumentation code that backs it, which this app
  // never uses. Debug statements are dev-only noise not needed in prod.
  bundleSizeOptimizations: { excludeTracing: true, excludeDebugStatements: true },
});
