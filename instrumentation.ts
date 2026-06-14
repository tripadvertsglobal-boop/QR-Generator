import type { Instrumentation } from "next";

// Next.js observability hooks. Sentry is only loaded when SENTRY_DSN is set, so
// this is a complete no-op until you add the DSN in Vercel — nothing to enable
// in code. See sentry.server.config.ts / sentry.edge.config.ts.
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
