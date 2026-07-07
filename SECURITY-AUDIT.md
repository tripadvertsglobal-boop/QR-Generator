# Security Audit — qrgenerator

**Date:** 2026-07-05
**Scope:** Application source (`app/`, `lib/`), database migrations (`supabase/migrations/`), configuration, and dependencies. Reviewed by static analysis; no findings were exploited against a live environment.

> **Remediation status (2026-07-05):** All ten findings have been addressed in code. `typecheck`, `lint`, the 103-test suite, and `next build` all pass, and `npm audit` reports 0 vulnerabilities. Two items need an operational step to take effect: **#9** requires applying migration `00012_resolve_slug_config_scope.sql` to each database, and **#6** ships the CSP in **Report-Only** mode — promote it to enforcing after confirming the violation reports are clean. Set `LINK_UNLOCK_SECRET`, `ALLOWED_ORIGINS`, and `SAFE_BROWSING_API_KEY` in every production/preview environment (see individual items).

## Summary

The application has a solid security baseline: Row-Level Security is enabled on every table with owner-scoped policies, every API query is explicitly scoped by `user_id` (so the RLS-bypassing service-role client used for API-key auth stays tenant-isolated), API keys are stored as SHA-256 hashes, link passwords use bcrypt, and the `service_role` key is kept off the edge. `SECURITY DEFINER` functions pin `search_path` and re-check ownership.

The findings below are the gaps on top of that baseline, ordered by severity. The two most important are the **hardcoded fallback for the link-unlock signing secret** (password-gate bypass if the env var is ever unset in production) and the **incomplete SSRF guard on webhook URLs**.

| # | Severity | Finding | Location | Status |
|---|----------|---------|----------|--------|
| 1 | High | Hardcoded fallback for `LINK_UNLOCK_SECRET` allows password-gate bypass | `lib/link-token.ts` | ✅ Fixed |
| 2 | High | SSRF guard on webhooks is bypassable (no DNS resolution, follows redirects) | `lib/ssrf.ts`, `lib/webhooks.ts` | ✅ Fixed |
| 3 | Medium | No rate limiting on the public password-verify endpoint (brute force) | `app/r/[slug]/verify/route.ts` | ✅ Fixed |
| 4 | Medium | CSV formula injection in the export endpoint | `app/api/v1/qrcodes/export/route.ts` | ✅ Fixed |
| 5 | Medium | Permissive default CORS reflects any origin when `ALLOWED_ORIGINS` is unset | `lib/cors.ts` | ✅ Fixed |
| 6 | Medium | No HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) | `next.config.ts` | ✅ Fixed (CSP Report-Only) |
| 7 | Low | Safe Browsing check fails open and is a no-op without an API key | `lib/safe-browsing.ts` | ✅ Fixed (observability) |
| 8 | Low | Raw database error messages returned to API clients | multiple routes | ✅ Fixed |
| 9 | Low | `resolve_slug_config` discloses destinations of inactive/scheduled codes to anonymous callers | `supabase/migrations/00007_advanced_links.sql` | ✅ Fixed (migration `00012`, apply to DB) |
| 10 | Low | Dependency advisories (`postcss` via `next`) — 5 moderate | `package.json` | ✅ Fixed |

---

## 1. Hardcoded fallback for `LINK_UNLOCK_SECRET` (High)

**Location:** `lib/link-token.ts:4`

```ts
const SECRET = process.env.LINK_UNLOCK_SECRET || "dev-insecure-unlock-secret";
```

**Issue.** The HMAC key that signs password-unlock cookies falls back to a public constant when the env var is missing. The unlock token is `"<expiryMs>.<hmac>"`, and the redirect engine (`app/r/[slug]/route.ts:79-84`) grants access to a password-protected link on any valid token. If `LINK_UNLOCK_SECRET` is ever unset in production (a new deploy, a missed env var in a new Vercel project, a preview environment), anyone can forge a valid unlock cookie for any slug and **completely bypass the password gate** — no bcrypt check required. The secret is a known string committed to the repo, so this is not a guessing problem.

**Impact.** Full bypass of the password-gate feature for every protected link. Silent — nothing surfaces the weak key at runtime.

**How to fix.** Fail closed at startup instead of falling back. Require the secret in production and refuse to sign/verify without it:

```ts
const SECRET = process.env.LINK_UNLOCK_SECRET;
if (!SECRET && process.env.NODE_ENV === "production") {
  throw new Error("LINK_UNLOCK_SECRET must be set in production");
}
const KEY = SECRET || "dev-insecure-unlock-secret"; // dev/test only
```

Apply the same pattern to any other secret with a dev fallback. Confirm `LINK_UNLOCK_SECRET` is set in every production and preview environment, and rotate it (rotation invalidates outstanding unlock cookies, which is acceptable — users re-enter the password).

---

## 2. SSRF guard on webhooks is bypassable (High)

**Location:** `lib/ssrf.ts`, dispatch in `lib/webhooks.ts:59`

**Issue.** The server makes outbound POSTs to user-supplied webhook URLs. `isPublicWebhookUrl` tries to block private targets, but the guard operates only on the URL string and has three gaps:

1. **No DNS resolution.** A public hostname like `http://webhook.attacker.com` that has an `A` record pointing at `127.0.0.1` or `169.254.169.254` (cloud metadata) passes the check — the string isn't a private literal. This is classic DNS-rebinding-style SSRF. **(Primary gap.)**
2. **Redirect following.** `fetch(hook.url, …)` in `dispatchEvent` follows 3xx by default, so a public URL can `302` to `http://169.254.169.254/…` after the check has passed.

(Note: alternate IPv4 encodings — decimal `http://2130706433/`, hex `http://0x7f000001/`, octal `http://0177.0.0.1/` — are *not* a gap here, because the WHATWG `URL` parser normalizes them to dotted-decimal before `isPrivateHost` sees them. Verified during remediation.)

**Impact.** On cloud hosting, reaching `169.254.169.254` can expose instance metadata and credentials. More broadly it lets an authenticated user probe/POST to internal services. The `scan.threshold` dispatch runs from the edge redirect path, so it can be triggered by public scans.

**Fix applied.**
- Added `isPublicWebhookUrlResolved` in `lib/ssrf.ts`: it runs the structural check, then `dns.lookup(host, { all: true })` and rejects if **any** resolved address is private/loopback/link-local (fails closed if the host can't be resolved). The webhook-create route (`app/api/v1/webhooks/route.ts`) now awaits this instead of the sync check.
- Set `redirect: "manual"` on the dispatch `fetch` in `lib/webhooks.ts`, so a 3xx to an internal host is not followed (it surfaces as `!res.ok` and is treated as a delivery failure).

**Residual risk / follow-up.** DNS resolution at registration narrows but does not fully close the rebinding window (the record can change between check and dispatch). For higher assurance, resolve-and-pin at dispatch time or route outbound webhook traffic through an egress allow-list/proxy. Also ensure test/preview deployments run with `NODE_ENV=production` so the guard is active there.

---

## 3. No rate limiting on the password-verify endpoint (Medium)

**Location:** `app/r/[slug]/verify/route.ts`

**Issue.** `POST /r/[slug]/verify` does a bcrypt comparison against the link password and is public and unauthenticated. Unlike the API surface (wrapped in `withAuth` → `checkRateLimit`) and the edge redirect (`app/r/[slug]/route.ts:35`, per-IP throttle), this route has **no rate limiting**. Link passwords are validated at only `min(4)` chars (`lib/validation.ts:22`), so a 4-character password is brute-forceable. bcrypt slows each attempt but does not stop an automated campaign against a known slug.

**Impact.** Offline-style brute force of weak link passwords, one online request at a time but unbounded in volume.

**How to fix.** Add a per-IP (and/or per-slug) rate limit using the existing `checkRateLimit` helper before the bcrypt compare, e.g.:

```ts
const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
const rl = await checkRateLimit(`verify:${slug}:${ip}`, 10); // 10/min
if (!rl.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
```

Consider also raising the minimum link-password length and adding a short lockout/backoff after repeated failures.

---

## 4. CSV formula injection in export (Medium)

**Location:** `app/api/v1/qrcodes/export/route.ts:17-20`

**Issue.** `csvCell` correctly quotes values containing `"`, `,`, or newline, but does not neutralize spreadsheet formula prefixes. User-controlled fields (`name`, `destination_url`, `tags`) are written to the CSV verbatim. A value like `=HYPERLINK("http://evil","click")` or `=cmd|'/c calc'!A1` is interpreted as a formula when the exported file is opened in Excel/Sheets.

**Impact.** Formula/command injection against whoever opens the export — data exfiltration via `=HYPERLINK`/`=WEBSERVICE`, or command execution paths in some spreadsheet configurations. The attacker sets the value on their own QR code; the victim is the account owner (or teammate) opening the CSV.

**How to fix.** Prefix any cell beginning with `=`, `+`, `-`, `@`, tab, or CR with a single quote (or a leading `'`), inside `csvCell`:

```ts
function csvCell(value: unknown): string {
  let s = value == null ? "" : Array.isArray(value) ? value.join(" ") : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;          // neutralize formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
```

---

## 5. Permissive default CORS (Medium)

**Location:** `lib/cors.ts:19-23`

**Issue.** When `ALLOWED_ORIGINS` is unset, the API reflects the request `Origin` (or `*`) into `Access-Control-Allow-Origin` for the entire `/api/v1/*` surface. The default is "allow any origin." Credentials (`Access-Control-Allow-Credentials`) are not set, which limits exposure for cookie-authenticated calls — but the default still means any website can drive the API with a user-supplied `Authorization`/`X-API-Key` from the browser, and it removes the origin as a defense-in-depth control.

**Impact.** Weaker than it should be by default; the safety of the deployment depends entirely on an env var being configured. Easy to ship a production instance that is wide open.

**How to fix.** Fail closed: in production, if `ALLOWED_ORIGINS` is empty, return no `Access-Control-Allow-Origin` (deny cross-origin) rather than reflecting `*`. Keep the permissive behavior only for dev/test. Document `ALLOWED_ORIGINS` as a required production variable, and never pair a reflected origin with `Access-Control-Allow-Credentials: true`.

---

## 6. Missing HTTP security headers (Medium)

**Location:** `next.config.ts` (empty config)

**Issue.** No `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, or `Referrer-Policy` are set. The dashboard and the password-unlock interstitial can be framed (clickjacking), and there is no CSP to blunt XSS if a sink is ever introduced.

**How to fix.** Add a `headers()` block in `next.config.ts`:

```ts
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

Tune the CSP against what the app actually loads (Supabase, Vercel Analytics/Speed Insights, Sentry) and roll it out in report-only mode first. Exempt the redirect engine (`/r/*`) from `X-Frame-Options` only if framing is genuinely needed there.

---

## 7. Safe Browsing check fails open / no-op without a key (Low)

**Location:** `lib/safe-browsing.ts:16,48`

**Issue.** `isUrlSafe` returns `true` when no `SAFE_BROWSING_API_KEY` is configured, and also returns `true` on any API error/timeout ("fail open"). So malicious-URL screening is silently disabled unless the key is present and Google is reachable.

**Impact.** The product can be used to mint tracking links to phishing/malware destinations with no screening. This is a documented design choice ("ship dark"), so it's Low, but worth an explicit decision.

**How to fix.** Ensure `SAFE_BROWSING_API_KEY` is set in production and alert if it isn't. Decide deliberately whether to fail open or closed on API errors; if links are high-trust, consider queuing for re-check rather than allowing unconditionally. At minimum, log when the check is skipped so it's observable.

---

## 8. Raw database error messages returned to clients (Low)

**Location:** e.g. `app/api/v1/qrcodes/route.ts:50,114`; `folders/route.ts:34`; `keys/route.ts:35`; and most routes' `{ error: error.message }` branches.

**Issue.** Supabase/Postgres error strings are passed straight back in JSON responses. These can leak schema details, constraint names, and internal messages that aid an attacker mapping the backend.

**How to fix.** Return a generic client message ("Invalid request" / "Could not complete request") and log the detailed `error` server-side (the code already has `log()` and `captureException`). Keep the specific, intentional mappings (e.g. `23505` → "already exists", `PGRST116` → 404); only the fallthrough `error.message` should be generalized.

---

## 9. `resolve_slug_config` discloses inactive-code destinations (Low)

**Location:** `supabase/migrations/00007_advanced_links.sql` (`resolve_slug_config`), called from `app/r/[slug]/route.ts:42`

**Issue.** To let the edge return `410` for paused/expired codes, the RPC returns config for a slug **regardless of `is_active` or schedule window**, and it's granted to `anon`. Anyone who knows/guesses a slug can read `destination_url` (and A/B destinations) of a code that is paused, expired, or not-yet-active — content the owner may consider unpublished. Slugs are 7 chars from a ~56-char alphabet, so guessing is impractical at scale, but a leaked/retired slug still resolves its destination.

**How to fix.** If unpublished destinations are sensitive, have the RPC (or the edge) return only the minimal state needed to render the terminal page (e.g. a status enum) without the `destination_url`/`ab_destinations` for non-active codes. Otherwise, document that a slug's destination is discoverable for its lifetime.

---

## 10. Dependency advisories (Low)

**Finding.** `npm audit` reports 5 moderate advisories: a `postcss` line-parsing issue pulled in transitively through `next` (which in turn is a dependency of `@sentry/nextjs`, `@vercel/analytics`, `@vercel/speed-insights`). Current: `next@16.2.9`.

**How to fix.** Run `npm audit` and update `next` to a patched release within the 16.x line (avoid the `--force` downgrade to `next@9`, which `npm audit fix --force` suggests and which is a major breaking regression). Re-run the test/build suite after upgrading. Add `npm audit --omit=dev` (or a Dependabot/Renovate check) to CI so new advisories surface automatically.

---

## Things that were checked and look correct

- **Tenant isolation.** Every API query filters by `.eq("user_id", auth.userId)` even under the RLS-bypassing service client used for API-key auth (`lib/auth.ts:34`). RLS policies are owner-scoped on all tables.
- **API-key storage.** Keys are SHA-256 hashed (`lib/apikey.ts`), only a `key_prefix` is stored for display, and the raw key is returned exactly once. Revocation purges the KV cache (`purgeApiKeyCache`).
- **Scope & privilege separation.** API keys are limited to `qrcodes:*`/`folders:*`; key and account management is `jwtOnly`. The 4-key cap is enforced both in the handler and by a race-proof DB trigger.
- **Password handling.** Link passwords use bcrypt; the hash is read only via the server-side service client and is never exposed over PostgREST (the anon `get_password_hash` RPC was deliberately dropped in migration `00008`). `stripSecret`/explicit column lists keep `password_hash` out of API responses and exports.
- **Cron endpoint.** `/api/cron/audit-retention` is gated by `CRON_SECRET` bearer check.
- **Secrets in VCS.** `.env*` is gitignored (only `.env.example` tracked); no secrets found in git history.
- **SECURITY DEFINER hygiene.** All definer functions pin `search_path = public` and re-check `auth.uid()` ownership; `handle_new_user` execute is revoked from public roles.
- **Constant-time token compare.** `lib/link-token.ts` uses a length-checked XOR compare for the unlock HMAC.

## Suggested remediation order

1. **#1 (`LINK_UNLOCK_SECRET`)** and **#2 (webhook SSRF)** — highest impact, fix first.
2. **#3 (verify rate limit)**, **#4 (CSV injection)**, **#5 (CORS default)**, **#6 (security headers)** — straightforward, high-value hardening.
3. **#7–#10** — decisions/cleanup; fold into normal maintenance and CI.
