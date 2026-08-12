// Structured JSON logging — one line per event, parseable by Vercel/Logflare.
type Level = "info" | "warn" | "error";

export function log(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, msg, ...fields, ts: new Date().toISOString() });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// Report an exception to Sentry when configured; always a no-op without a DSN.
//
// Imports @sentry/node-core/light, not @sentry/nextjs - see
// sentry.server.config.ts for why the nodejs runtime uses the lighter client.
// This is the entry point that actually matters for bundle size: it's
// imported (via lib/api-error.ts, lib/auth.ts, lib/rate-limit.ts, etc.) from
// nearly every server route, so pulling in the heavy client here alone was
// enough to keep it in the Worker regardless of what sentry.server.config.ts
// or instrumentation.ts imported.
export async function captureException(
  err: unknown,
  context: Record<string, unknown> = {},
): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  try {
    const { captureException: sentryCaptureException } = await import("@sentry/node-core/light");
    sentryCaptureException(err, { extra: context });
  } catch {
    /* never let observability break the request */
  }
}
