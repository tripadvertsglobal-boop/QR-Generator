import type { NextConfig } from "next";

// Origin the browser Supabase client talks to (auth REST + realtime wss), needed
// in connect-src so a future enforcing CSP doesn't break login.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();
const supabaseWs = supabaseOrigin.replace(/^http/, "ws");

// Enforcing headers that are always safe (no legitimate request depends on their
// absence). Clickjacking is covered here by X-Frame-Options + the CSP's
// frame-ancestors.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

// CSP shipped in Report-Only first: it observes violations without breaking the
// app. 'unsafe-inline' covers Next's inline hydration scripts/styles; connect-src
// allows the Supabase browser client. Promote to `Content-Security-Policy`
// (enforcing) once the violation reports come back clean.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
