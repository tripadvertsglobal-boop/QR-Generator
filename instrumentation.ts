import type { Instrumentation } from "next";
import { assertProductionConfig } from "./lib/env";
import { log } from "./lib/log";

// Next.js observability hooks. Sentry is only loaded when SENTRY_DSN is set, so
// this is a complete no-op until you add the DSN in Vercel — nothing to enable
// in code. See sentry.server.config.ts / sentry.edge.config.ts.
export async function register() {
  // Runtime safety net for the config contract. next.config.ts already fails
  // the production *build* on a missing var; this catches the case where the
  // build ran elsewhere or an env var was removed after deploy. Runs once per
  // cold start, on the Node runtime only (edge has no full env at boot).
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.VERCEL_ENV === "production") {
    for (const warning of assertProductionConfig(process.env)) {
      log("warn", "config_warning", { warning });
    }
  }

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
