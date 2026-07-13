# API Review — 2026-07-12

> **Status (2026-07-13): all 14 findings fixed.** Each item below carries a
> **Fixed:** note describing the change. Migrations `00014` (new RPC for
> item 14) and `00015` (revokes a Supabase default-privilege anon EXECUTE
> grant on `get_scan_timeseries` / `get_scan_geo` found while verifying 00014;
> harmless — both fail closed on the auth.uid() ownership check — but contrary
> to their migrations' intent) are applied to both the production and testing
> Supabase projects; function ACLs verified on both.

Scope: all handlers under `app/api/**`, the public redirect engine (`app/r/[slug]/*`),
and the shared libs they depend on (`lib/auth.ts`, `lib/cors.ts`, `lib/rate-limit.ts`,
`lib/validation.ts`, `lib/qr-write.ts`, `lib/webhooks.ts`, `lib/audit.ts`, `lib/ssrf.ts`,
`lib/safe-browsing.ts`, `lib/kv.ts`, `lib/link-token.ts`).

Overall the API surface is in good shape: dual auth (JWT / API key) with scope gating,
explicit tenant scoping on every query, generic DB error responses, CORS fail-closed in
production, SSRF-guarded webhooks, CSV formula-injection escaping, and audit logging with
sensitive-field filtering. The issues below are what remain.

---

## High

### 1. `ab_destinations` URLs bypass Safe Browsing
- **Where:** `app/api/v1/qrcodes/route.ts:32` (create), `app/api/v1/qrcodes/[id]/route.ts:35` (update)
- Only `destination_url` is screened with `isUrlSafe()`. The A/B destination URLs in
  `ab_destinations` are validated as http(s) URLs but never checked against Safe Browsing —
  yet `pickDestination()` (`lib/slug-config.ts:47`) redirects real scanners to them.
  A malicious URL can be smuggled in as an A/B arm (even with the primary URL clean, or
  weighted so the A/B arm gets ~100% of traffic).
- **Fix:** run `isUrlSafe()` over every `ab_destinations[].url` on create and update.
- **Fixed:** create and update now screen `destination_url` plus every `ab_destinations[].url` via `isUrlSafe()` before writing.

### 2. Bulk create skips Safe Browsing entirely
- **Where:** `app/api/v1/qrcodes/bulk/route.ts` (POST)
- The single-create endpoint screens `destination_url`; the bulk endpoint inserts up to
  100 destinations per request with no `isUrlSafe()` call at all. This is the cheapest
  path for an abuser to mint malicious QR links at scale.
- **Fix:** screen each destination (results are KV-cached 30 min, so duplicate URLs are
  cheap). Reject the batch or the offending entries with a clear error.
- **Fixed:** bulk create screens all destinations with `isUrlSafe()` and rejects the batch naming the offending index (`codes[i].destination_url ...`).

---

## Medium

### 3. Bulk create returns raw DB rows (contract + hygiene)
- **Where:** `app/api/v1/qrcodes/bulk/route.ts:54-58`
- The response spreads the entire inserted row (`{ ...row, tracking_url }`), so it exposes
  every column — including `password_hash` (always `null` here, but the column shouldn't
  exist in a response) and internal fields. The single-create endpoint deliberately returns
  a curated, stable contract; bulk create leaks whatever the schema happens to be.
- **Fix:** return the same curated field set as single create (or at minimum pass rows
  through `stripSecret()` from `lib/qr-write.ts`).
- **Fixed:** bulk create now returns the same curated field set as single create (incl. `tracking_url` / `qr_svg_url`); raw rows are never exposed.

### 4. `folder_id` ownership is never verified
- **Where:** `app/api/v1/qrcodes/route.ts` (create), `app/api/v1/qrcodes/[id]/route.ts`
  (update), `app/api/v1/qrcodes/bulk/route.ts` (bulk create)
- Any valid folder UUID is accepted. The FK only checks the folder *exists*, not that it
  belongs to the caller — and under API-key auth `auth.db` is the RLS-bypassing service
  client. Consequences: a caller can attach their QR to another tenant's folder, and the
  insert success/failure acts as an existence oracle for folder UUIDs across tenants.
- **Fix:** when `folder_id` is provided, verify a `folders` row with that id **and**
  `user_id = auth.userId` exists; otherwise return 400/404.
- **Fixed:** all three endpoints verify the folder exists **and** belongs to the caller before writing; unknown/foreign folders return 400 "Folder not found".

### 5. A Redis outage turns into 500s everywhere (rate limiter fails open in the wrong direction)
- **Where:** `lib/rate-limit.ts:32-41`, called at `lib/auth.ts:167` (before/outside the
  handler try/catch) and `app/r/[slug]/route.ts:36`
- `checkRateLimit()` no-ops cleanly when Redis is *unconfigured*, but has no error handling
  when Redis is configured and *unreachable* — the pipeline throws. In `withAuth` this
  happens before the `try` block, so every authenticated API request 500s; on the redirect
  path every scan 500s. An Upstash blip becomes a full outage of both the API and the
  redirect engine.
- **Fix:** wrap the pipeline in try/catch and fail open (allow, log) on Redis errors —
  same posture as the Safe Browsing client.
- **Fixed:** `checkRateLimit()` wraps the Redis pipeline in try/catch and fails open (allow + `rate_limit_error` warn log) when Redis is unreachable.

### 6. List/export endpoints are silently truncated at PostgREST's row cap
- **Where:** `app/api/v1/qrcodes/route.ts` (GET, no limit), `app/api/v1/qrcodes/export/route.ts`
  (no limit), `app/api/v1/account/export/route.ts` (`.limit(10000)` on scan/audit logs)
- Supabase/PostgREST caps responses at `max-rows` (default **1000**) regardless of the
  requested limit. An account with >1000 codes gets a silently incomplete dashboard list
  and — worse — a silently incomplete CSV/GDPR export. `.limit(10000)` does not override
  the server cap.
- **Fix:** add cursor/offset pagination to the list endpoint, and page through results
  server-side (`.range()` loops) for the CSV and GDPR exports. Verify the project's
  `max-rows` setting.
- **Fixed:** `GET /qrcodes` supports `?limit` (1–1000, default 1000) / `?offset` with an explicit `.range()`; both exports page through all rows via `lib/paginate.ts` (`fetchAllRows`).

### 7. Authentication runs before any rate limiting
- **Where:** `lib/auth.ts:147-178` (auth at 147, rate limit at 167)
- Unauthenticated requests (e.g. API-key guessing) never hit the rate limiter — they only
  reach the 401. Each bad `x-api-key` costs a SHA-256 + a DB lookup (misses are not
  negatively cached), so a spray is an uncapped DB-load vector. Key entropy makes actual
  brute-force infeasible; this is a DoS/cost concern, not a credential-compromise one.
- **Fix:** add a per-IP pre-auth throttle (the redirect route already does this pattern),
  and/or negative-cache key-hash misses in KV for a short TTL.
- **Fixed:** `withAuth` now applies a pre-auth per-IP throttle (1000 req/min) before resolving credentials, so unauthenticated sprays are capped before any DB lookup.

### 8. Auto-disabled webhooks cannot be re-enabled through the API
- **Where:** `lib/webhooks.ts:78-82` (sets `is_active: false` after 10 failures);
  `app/api/v1/webhooks/*` (only POST/GET/DELETE exist)
- Once a webhook trips `MAX_FAILURES` there is no PATCH endpoint to reset `failure_count`
  or re-activate it. The only recourse is delete + recreate, which rotates the signing
  secret and forces the consumer to reconfigure.
- **Fix:** add `PATCH /api/v1/webhooks/[id]` supporting `is_active: true` (resetting
  `failure_count`), or document delete/recreate as the intended flow.
- **Fixed:** added `PATCH /api/v1/webhooks/[id]` (JWT-only) accepting `{ is_active }`; re-enabling resets `failure_count` to 0. Audited as `webhook.update`.

---

## Low

### 9. Cron endpoint fails open when `CRON_SECRET` is unset
- **Where:** `app/api/cron/audit-retention/route.ts:9-12`
- `if (secret && ...)` means no secret ⇒ no auth: anyone can invoke the purge. Impact is
  limited (it only deletes audit rows already past the 90-day retention), but it should
  fail closed: return 401/503 when `CRON_SECRET` is missing in production.
- **Fixed:** in production the endpoint returns 503 when `CRON_SECRET` is unset (fail closed); dev/test behavior unchanged.

### 10. Account deletion doesn't purge API-key KV cache
- **Where:** `app/api/v1/account/route.ts` (DELETE) vs `lib/auth.ts:70` (60s key cache)
- Deleting an account cascades the `api_keys` rows away, but cached key records keep
  authenticating for up to 60s. Queries scoped to the deleted `user_id` return nothing, so
  exposure is minimal — but for symmetry with key revocation, fetch the user's `key_hash`es
  and `purgeApiKeyCache()` them before `deleteUser`.
- **Fixed:** account deletion now fetches the user's `key_hash`es and purges each from the KV key cache before `deleteUser`.

### 11. No cross-validation of `active_from` / `active_until`
- **Where:** `lib/validation.ts:28-51`
- A window with `active_until <= active_from` is accepted and yields a permanently
  dead link with no warning. Add a `.refine()` that `until > from` when both are set.
- **Fixed:** create/update schemas refine that `active_until > active_from` whenever both are provided.

### 12. 429 responses omit `Retry-After`
- **Where:** `lib/auth.ts:173-178`, `app/r/[slug]/route.ts:37`, `app/r/[slug]/verify/route.ts:17`
- `X-RateLimit-Reset` is present on API 429s, but the standard `Retry-After` header (which
  generic HTTP clients honor) is not, and the redirect/verify 429s carry no hints at all.
- **Fixed:** `Retry-After` is now set on all 429s — both API limiter responses, the redirect throttle, and the password-verify throttle.

### 13. Raw IPs stored in `audit_logs` while scan IPs are hashed
- **Where:** `lib/audit.ts:65-66` vs `lib/scan-agent.ts:23` (`hashIp`)
- Scan logging deliberately stores only an HMAC of the IP; audit logging stores the raw
  `x-forwarded-for` value for 90 days and returns it to the user via
  `/api/v1/account/audit-log`. Defensible (security trail for the account owner), but
  inconsistent — worth an explicit decision for GDPR data-minimization posture.
- **Fixed:** audit IPs are masked before storage (`maskIp`: IPv4 keeps /24, IPv6 keeps /48) — enough to spot an unfamiliar origin, consistent with the hashed scan IPs.

### 14. Analytics is JWT-only — API keys with `qrcodes:read` can't reach it
- **Where:** `app/api/v1/qrcodes/[id]/analytics/route.ts:35`
- Deliberate (the `get_scan_timeseries` RPC enforces ownership via `auth.uid()`, unset
  under service-role auth), but it's a gap in the API-key surface: an integration can
  create and manage codes yet can't read their scan timeseries. If integrations need
  analytics, add an ownership-checked service-role path.
- **Fixed:** the route now takes `scope: "qrcodes:read"`; API-key auth calls the new `get_scan_timeseries_svc` RPC (migration `00014`, service_role-only) which checks ownership against the key's user id.

---

## Notes (verified fine)

- Every query under API-key (service-role) auth I checked is explicitly scoped by
  `user_id` / `auth.userId`, per the `AuthContext` contract.
- `password_hash` is excluded from single create/list/PATCH responses (`stripSecret`),
  GDPR export, and audit snapshots/diffs (`SENSITIVE` set); the verify endpoint reads it
  service-side only.
- DB errors are logged server-side and returned as a generic message (`lib/api-error.ts`);
  intentional 404/409 mappings stay inline.
- Webhook dispatch refuses redirects (SSRF), signs with per-hook HMAC secrets, and
  registration does structural + DNS-resolved private-range checks.
- CORS fails closed in production without an allow-list; unlock tokens are HMAC-signed
  with a production-enforced secret and constant-time compared; CSV export neutralizes
  spreadsheet formula injection; slug collisions retry then 503.
