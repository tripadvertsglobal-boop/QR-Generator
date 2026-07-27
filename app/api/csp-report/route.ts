import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";

// POST /api/csp-report — sink for Content-Security-Policy violation reports.
//
// Without a destination, a Report-Only CSP is inert: the browser has nowhere to
// send violations, so the policy can never be validated and never promoted to
// enforcing. This endpoint is that destination.
//
// Public by necessity (browsers post here unauthenticated), so it is throttled
// per IP — a violating page can otherwise emit a report on every load.
const REPORT_LIMIT = 60; // reports/min per IP

export async function POST(request: Request) {
  const ip = clientIp(request) ?? "unknown";
  const rl = await checkRateLimit(`csp:${ip}`, REPORT_LIMIT);
  if (!rl.ok) return new NextResponse(null, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  // Browsers send either the legacy {"csp-report": {...}} shape (report-uri) or
  // an array of reports (report-to). Normalise to a list of bodies.
  const reports = Array.isArray(body)
    ? body.map((r) => (r as { body?: unknown }).body ?? r)
    : [(body as { "csp-report"?: unknown })["csp-report"] ?? body];

  for (const report of reports) {
    const r = (report ?? {}) as Record<string, unknown>;
    log("warn", "csp_violation", {
      directive: r["effective-directive"] ?? r.effectiveDirective ?? r["violated-directive"],
      blockedUri: r["blocked-uri"] ?? r.blockedURL,
      documentUri: r["document-uri"] ?? r.documentURL,
      disposition: r.disposition,
    });
  }

  return new NextResponse(null, { status: 204 });
}
