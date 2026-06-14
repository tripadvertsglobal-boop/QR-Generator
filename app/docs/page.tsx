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
        summary: "Create a dynamic QR code. Returns the row plus a tracking_url.",
        details: [
          "Body: destination_url (http/https, required), name?, folder_id?, tags?[],",
          "active_from?, active_until? (ISO 8601), password?, ab_destinations?[{url,weight}]",
          "Destination is checked against Google Safe Browsing; unsafe URLs → 400.",
        ],
      },
      {
        method: "GET",
        path: "/api/v1/qrcodes",
        auth: "scope qrcodes:read",
        summary: "List your QR codes (newest first). Password hashes are never returned.",
        details: ["Query: ?folder=<uuid|none>, ?tag=<tag>"],
      },
      {
        method: "PATCH",
        path: "/api/v1/qrcodes/{id}",
        auth: "scope qrcodes:write",
        summary: "Update destination, is_active, name, folder, tags, or advanced-link fields.",
        details: ["Editing the destination updates the redirect instantly (KV is kept in sync)."],
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
      },
      {
        method: "POST",
        path: "/api/v1/qrcodes/bulk",
        auth: "scope qrcodes:write",
        summary: "Create up to 100 codes in one request.",
        details: ["Body: { codes: [{ destination_url, name?, folder_id?, tags? }] } (1–100)"],
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
