import { NextResponse } from "next/server";

// CORS for the public API surface (/api/v1/*). M8 tightens the allow-list and
// drops `*` in production; for now reflect any origin so external clients work.
export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
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
