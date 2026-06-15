import type { Metadata } from "next";
import { siteConfig } from "@/site.config";
import MarketingShell from "../_components/MarketingShell";

export const metadata: Metadata = {
  title: `API docs — ${siteConfig.company.name}`,
  description: `REST API reference for ${siteConfig.company.name}: authentication, rate limits, and every endpoint.`,
};

type Method = "GET" | "POST" | "PATCH" | "DELETE";

type Endpoint = {
  method: Method;
  path: string;
  auth: string; // who can call it
  summary: string;
  details?: string[]; // params / body fields / notes
  request?: string; // example request body (JSON)
  response?: string; // example response body
};

type Group = { title: string; intro?: string; endpoints: Endpoint[] };

const groups: Group[] = [
  {
    title: "QR codes",
    intro: "The only group that accepts API keys (with the matching scope). All others are session-only.",
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/qrcodes",
        auth: "scope qrcodes:write",
        summary: "Generate a dynamic QR code. Returns the QR's id (UUID), tracking_url, and qr_svg_url.",
        details: [
          "Body: destination_url (http/https, required), name? (recommended), folder_id?,",
          "tags?[], active_from?, active_until? (ISO 8601), password?, ab_destinations?[{url,weight}]",
          "Destination is checked against Google Safe Browsing; unsafe URLs → 400.",
        ],
        request: `{
  "destination_url": "https://example.com/landing",
  "name": "Spring Campaign",
  "tags": ["q2", "print"]
}`,
        response: `201 Created
{
  "id": "8f3c0b2e-4d1a-4c9b-9f2e-1a2b3c4d5e6f",
  "name": "Spring Campaign",
  "destination_url": "https://example.com/landing",
  "short_slug": "a1B2c3",
  "tracking_url": "https://your-domain.com/r/a1B2c3",
  "qr_svg_url": "https://your-domain.com/api/v1/qrcodes/8f3c0b2e-.../qr.svg",
  "folder_id": null,
  "tags": ["q2", "print"],
  "is_active": true,
  "created_at": "2026-06-14T21:00:00.000Z"
}`,
      },
      {
        method: "GET",
        path: "/api/v1/qrcodes",
        auth: "scope qrcodes:read",
        summary: "List your QR codes (newest first). Password hashes are never returned.",
        details: ["Query: ?folder=<uuid|none>, ?tag=<tag>"],
        response: `200 OK
[
  {
    "id": "8f3c0b2e-4d1a-4c9b-9f2e-1a2b3c4d5e6f",
    "short_slug": "a1B2c3",
    "destination_url": "https://example.com/landing",
    "name": "Spring Campaign",
    "is_active": true,
    "scan_count": 42,
    "tags": ["q2"],
    "created_at": "2026-06-14T21:00:00.000Z"
  }
]`,
      },
      {
        method: "PATCH",
        path: "/api/v1/qrcodes/{id}",
        auth: "scope qrcodes:write",
        summary: "Update destination, is_active, name, folder, tags, or advanced-link fields.",
        details: ["Editing the destination updates the redirect instantly (KV is kept in sync)."],
        request: `{ "destination_url": "https://example.com/new-landing" }`,
        response: `200 OK
{
  "id": "8f3c0b2e-4d1a-4c9b-9f2e-1a2b3c4d5e6f",
  "short_slug": "a1B2c3",
  "destination_url": "https://example.com/new-landing",
  "is_active": true,
  ...
}`,
      },
      {
        method: "DELETE",
        path: "/api/v1/qrcodes/{id}",
        auth: "scope qrcodes:write",
        summary: "Delete a code. The slug 404s on the next scan.",
      },
      {
        method: "GET",
        path: "/api/v1/qrcodes/{id}/qr.svg",
        auth: "scope qrcodes:read",
        summary: "Scannable image of the tracking URL.",
        details: ["Query: ?format=png (default SVG). The image encodes /r/<slug>, never the destination."],
      },
      {
        method: "GET",
        path: "/api/v1/qrcodes/{id}/analytics",
        auth: "session only",
        summary: "Per-day scan timeseries.",
        details: ["Query: ?days=1..365 (default 30). Returns { days, series }."],
        response: `200 OK
{
  "days": 30,
  "series": [
    { "day": "2026-06-13", "scans": 8 },
    { "day": "2026-06-14", "scans": 34 }
  ]
}`,
      },
      {
        method: "POST",
        path: "/api/v1/qrcodes/bulk",
        auth: "scope qrcodes:write",
        summary: "Create up to 100 codes in one request.",
        details: ["Body: { codes: [{ destination_url, name?, folder_id?, tags? }] } (1–100)"],
        request: `{
  "codes": [
    { "destination_url": "https://example.com/a", "name": "Flyer A" },
    { "destination_url": "https://example.com/b", "name": "Flyer B" }
  ]
}`,
        response: `201 Created
{
  "created": 2,
  "codes": [
    { "id": "…", "short_slug": "a1B2c3", "tracking_url": "https://your-domain.com/r/a1B2c3", ... }
  ]
}`,
      },
      {
        method: "DELETE",
        path: "/api/v1/qrcodes/bulk",
        auth: "scope qrcodes:write",
        summary: "Delete up to 100 codes by id.",
        details: ["Body: { ids: [uuid] } (1–100)"],
      },
      {
        method: "GET",
        path: "/api/v1/qrcodes/export",
        auth: "scope qrcodes:read",
        summary: "Stream all your codes as CSV.",
      },
    ],
  },
  {
    title: "Folders",
    intro: "Session-only — API keys can only hold qrcodes scopes, so folder routes require a dashboard session.",
    endpoints: [
      { method: "GET", path: "/api/v1/folders", auth: "session only", summary: "List your folders." },
      {
        method: "POST",
        path: "/api/v1/folders",
        auth: "session only",
        summary: "Create a folder.",
        details: ["Body: { name, color? (#rrggbb) }"],
        request: `{ "name": "Q2 Campaigns", "color": "#4f46e5" }`,
        response: `201 Created
{ "id": "…", "name": "Q2 Campaigns", "color": "#4f46e5" }`,
      },
      {
        method: "PATCH",
        path: "/api/v1/folders/{id}",
        auth: "session only",
        summary: "Rename or recolor a folder.",
      },
      { method: "DELETE", path: "/api/v1/folders/{id}", auth: "session only", summary: "Delete a folder." },
    ],
  },
  {
    title: "API keys",
    intro: "Session-only. Max 4 active keys per account. The raw key is returned exactly once on creation.",
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/keys",
        auth: "session only",
        summary: "Mint a key (returns the secret once).",
        details: [
          "Body: { name, scopes?: [qrcodes:read|qrcodes:write], rate_limit?: 1..10000, expires_at? }",
          "409 if you already have 4 active keys.",
        ],
        request: `{ "name": "Production server", "scopes": ["qrcodes:read", "qrcodes:write"] }`,
        response: `201 Created
{
  "id": "…",
  "name": "Production server",
  "key_prefix": "qr_sk_a1b2",
  "scopes": ["qrcodes:read", "qrcodes:write"],
  "rate_limit": 100,
  "key": "qr_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"   // shown once — store it now
}`,
      },
      { method: "GET", path: "/api/v1/keys", auth: "session only", summary: "List your keys (never the secret)." },
      {
        method: "DELETE",
        path: "/api/v1/keys/{id}",
        auth: "session only",
        summary: "Revoke a key. It stops authenticating immediately (KV cache purged).",
      },
    ],
  },
  {
    title: "Webhooks",
    intro: "Session-only. Deliveries are HMAC-signed; verify the X-Webhook-Signature header with your secret.",
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/webhooks",
        auth: "session only",
        summary: "Register a webhook. URL must be a public endpoint (SSRF-guarded).",
        details: ["Body: { url, events: [qr.created|qr.updated|qr.deleted|scan.threshold] }"],
        request: `{
  "url": "https://your-server.com/hooks/qr",
  "events": ["qr.created", "scan.threshold"]
}`,
        response: `201 Created
{
  "id": "…",
  "url": "https://your-server.com/hooks/qr",
  "events": ["qr.created", "scan.threshold"],
  "secret": "whsec_…",   // verify the X-Webhook-Signature (sha256 HMAC) with this
  "is_active": true
}`,
      },
      { method: "GET", path: "/api/v1/webhooks", auth: "session only", summary: "List your webhooks." },
      { method: "DELETE", path: "/api/v1/webhooks/{id}", auth: "session only", summary: "Delete a webhook." },
    ],
  },
  {
    title: "Account",
    intro: "Session-only. Includes GDPR data portability and erasure.",
    endpoints: [
      { method: "GET", path: "/api/v1/account", auth: "session only", summary: "Your profile." },
      {
        method: "PATCH",
        path: "/api/v1/account",
        auth: "session only",
        summary: "Update profile (display_name, timezone).",
      },
      {
        method: "DELETE",
        path: "/api/v1/account",
        auth: "session only",
        summary: "GDPR erasure — deletes your account and cascades all owned data.",
      },
      {
        method: "GET",
        path: "/api/v1/account/export",
        auth: "session only",
        summary: "GDPR export — full JSON archive (password hashes stripped).",
      },
      { method: "GET", path: "/api/v1/account/audit-log", auth: "session only", summary: "Your recent mutations." },
    ],
  },
  {
    title: "Redirect engine",
    endpoints: [
      {
        method: "GET",
        path: "/r/{slug}",
        auth: "public",
        summary: "Resolve a scan: schedule → password → A/B → 302 to destination.",
        details: ["Served from the edge via KV. IP rate-limited to 5000/min. Records the scan asynchronously."],
      },
    ],
  },
];

const methodColor: Record<Method, string> = {
  GET: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  POST: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  PATCH: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  DELETE: "bg-red-500/15 text-red-700 dark:text-red-400",
};

function EndpointRow({ ep }: { ep: Endpoint }) {
  return (
    <div className="border-t border-black/10 py-4 first:border-t-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${methodColor[ep.method]}`}>
          {ep.method}
        </span>
        <code className="text-sm">{ep.path}</code>
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-black/60 dark:bg-white/10">{ep.auth}</span>
      </div>
      <p className="mt-2 text-sm text-black/70">{ep.summary}</p>
      {ep.details && (
        <ul className="mt-1 space-y-0.5 text-xs text-black/50">
          {ep.details.map((d) => (
            <li key={d} className="font-mono">{d}</li>
          ))}
        </ul>
      )}
      {ep.request && (
        <div className="mt-3">
          <p className="text-xs font-medium text-black/50">Request body</p>
          <pre className="mt-1 overflow-x-auto rounded-md bg-black/90 p-3 text-xs text-white">{ep.request}</pre>
        </div>
      )}
      {ep.response && (
        <div className="mt-3">
          <p className="text-xs font-medium text-black/50">Response</p>
          <pre className="mt-1 overflow-x-auto rounded-md bg-black/90 p-3 text-xs text-white">{ep.response}</pre>
        </div>
      )}
    </div>
  );
}

export default function DocsPage() {
  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight">API reference</h1>
        <p className="mt-4 text-black/60">
          A REST API over HTTPS. All endpoints live under <code className="text-sm">/api/v1</code> and return JSON.
        </p>

        {/* Quickstart */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Quickstart — generate a QR for a campaign</h2>
          <p className="mt-3 text-sm text-black/70">
            Create a dynamic QR with a destination URL and a name. The response returns the QR&apos;s{" "}
            <strong><code>id</code> (a UUID)</strong> — store it against your ad campaign. Change the destination
            later with <code>PATCH /api/v1/qrcodes/&#123;id&#125;</code> and the printed code keeps working.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-black/90 p-4 text-xs text-white">
{`curl -X POST https://your-domain.com/api/v1/qrcodes \\
  -H "X-API-Key: qr_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"destination_url":"https://example.com/landing","name":"Spring Campaign"}'`}
          </pre>
          <p className="mt-3 text-sm text-black/70">Response <code>201 Created</code>:</p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-black/90 p-4 text-xs text-white">
{`{
  "id": "8f3c0b2e-4d1a-4c9b-9f2e-1a2b3c4d5e6f",   // QR UUID — store against your campaign
  "name": "Spring Campaign",
  "destination_url": "https://example.com/landing",
  "short_slug": "a1B2c3",
  "tracking_url": "https://your-domain.com/r/a1B2c3",   // what the QR encodes
  "qr_svg_url": "https://your-domain.com/api/v1/qrcodes/8f3c0b2e-.../qr.svg",
  "is_active": true,
  "created_at": "2026-06-14T21:00:00.000Z"
}`}
          </pre>
        </section>

        {/* Authentication */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Authentication</h2>
          <p className="mt-3 text-sm text-black/70">
            Two methods. A dashboard <strong>session</strong> can call everything. An <strong>API key</strong> is
            limited to the scopes stored on it — currently <code>qrcodes:read</code> and <code>qrcodes:write</code> —
            so API keys reach the QR-code endpoints only. Endpoints marked <em>session only</em> reject API keys (403).
          </p>
          <p className="mt-3 text-sm text-black/70">
            Create a key in <strong>Dashboard → API keys</strong> (max 4 active). Send it on each request:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-black/90 p-4 text-xs text-white">
{`curl https://your-domain.com/api/v1/qrcodes \\
  -H "X-API-Key: qr_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`}
          </pre>
          <p className="mt-3 text-xs text-black/50">
            Keys are stored only as SHA-256 hashes; the raw value is shown once. Treat it like a password.
          </p>
        </section>

        {/* Rate limits */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Rate limits</h2>
          <p className="mt-3 text-sm text-black/70">
            Every response carries <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>, and{" "}
            <code>X-RateLimit-Reset</code>. Exceeding the limit returns <code>429</code>.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-black/70">
            <li>• Session (JWT): 200 requests/min</li>
            <li>• API key: 100 requests/min by default (configurable per key, up to 10,000)</li>
            <li>• Redirect <code>/r/&#123;slug&#125;</code>: 5,000/min per IP at the edge</li>
          </ul>
        </section>

        {/* Errors */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Errors</h2>
          <p className="mt-3 text-sm text-black/70">
            Errors return a JSON body <code>{`{ "error": "..." }`}</code> with a standard status:{" "}
            <code>400</code> invalid input · <code>401</code> unauthenticated · <code>403</code> wrong scope / session
            required · <code>404</code> not found · <code>409</code> conflict (e.g. key limit) · <code>429</code>{" "}
            rate limited.
          </p>
        </section>

        {/* Security */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Security model</h2>
          <ul className="mt-3 space-y-1 text-sm text-black/70">
            <li>• Keys stored as SHA-256 hashes; <code>qr_sk_</code> prefix lets secret scanners flag leaks.</li>
            <li>• Scoped + capped (4/account); revocation purges the auth cache immediately.</li>
            <li>• Every mutation is audit-logged; view it under Dashboard → Audit log.</li>
            <li>• Tenant isolation via Postgres row-level security on every table.</li>
            <li>• Destinations screened by Google Safe Browsing; webhook URLs are SSRF-guarded.</li>
            <li>• CORS is locked to an allow-list in production.</li>
          </ul>
        </section>

        {/* Endpoints */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Endpoints</h2>
          {groups.map((g) => (
            <div key={g.title} className="mt-8">
              <h3 className="text-lg font-semibold">{g.title}</h3>
              {g.intro && <p className="mt-1 text-sm text-black/50">{g.intro}</p>}
              <div className="mt-3 rounded-xl border border-black/10 px-5">
                {g.endpoints.map((ep) => (
                  <EndpointRow key={`${ep.method} ${ep.path}`} ep={ep} />
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </MarketingShell>
  );
}
