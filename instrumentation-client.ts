// Sentry init for the browser. Without this file only server and edge errors
// are captured — every client-side exception in the dashboard is invisible.
//
// The browser cannot read SENTRY_DSN (server-only), so the client uses the
// NEXT_PUBLIC_ copy. Unset = fully disabled, matching the server behaviour.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  tracesSampleRate: 0,
});

// Lets Sentry tie errors to the navigation that caused them (App Router).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
