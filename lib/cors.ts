import { NextResponse } from "next/server";

// Comma-separated allow-list (e.g. "https://app.example.com,https://acme.com").
// When set, only listed origins are reflected; when unset, any origin is allowed
// (convenient for local dev / public read APIs).
const ALLOW_LIST = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// CORS for the public API surface (/api/v1/*).
export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (ALLOW_LIST.length > 0) {
    if (origin && ALLOW_LIST.includes(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
  } else if (process.env.NODE_ENV !== "production") {
    // Dev/test convenience only: reflect any origin so local tooling works.
    headers["Access-Control-Allow-Origin"] = origin ?? "*";
  }
  // In production with no allow-list, and for disallowed origins, no ACAO header
  // is sent → the browser blocks the cross-origin read (fail closed).
  return headers;
}

export function applyHeaders(res: Response, headers: Record<string, string>): Response {
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

// Shared CORS preflight handler — re-export as `OPTIONS` from each API route.
export function preflight(request: Request): Response {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}
