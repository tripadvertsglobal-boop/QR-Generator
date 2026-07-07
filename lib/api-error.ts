import { NextResponse } from "next/server";
import { log } from "@/lib/log";

// Generic client-facing response for unexpected database failures. The real
// Postgres/PostgREST message can leak schema and constraint details, so it is
// logged server-side and never returned to the caller. Intentional, friendly
// mappings (unique-violation, not-found, limit-reached, ...) should stay inline
// at the call site; only the catch-all fallthrough should use this.
export function dbError(error: { message?: string; code?: string }, status = 400): NextResponse {
  log("error", "db_error", { code: error.code, message: error.message });
  return NextResponse.json({ error: "Could not complete request" }, { status });
}
