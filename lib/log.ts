// Structured JSON logging — one line per event, parseable by Vercel/Logflare.
type Level = "info" | "warn" | "error";

export function log(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, msg, ...fields, ts: new Date().toISOString() });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// Report an exception to Sentry when configured; always a no-op without a DSN.
export async function captureException(
  err: unknown,
  context: Record<string, unknown> = {},
): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(err, { extra: context });
  } catch {
    /* never let observability break the request */
  }
}
