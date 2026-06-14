import { NextResponse } from "next/server";

// Minimal branded HTML response for the redirect engine's terminal states
// (expired/paused 410, unknown/not-yet-active 404). Edge-safe (string only).
export function statusPage(status: number, title: string, message: string): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>
  :root{color-scheme:light dark}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#fff;color:#171717}
  @media(prefers-color-scheme:dark){body{background:#0a0a0a;color:#ededed}}
  .card{text-align:center;padding:2rem;max-width:28rem}
  h1{font-size:1.5rem;margin:0 0 .5rem}
  p{opacity:.65;margin:0}
  .code{font-size:.75rem;opacity:.4;margin-top:1.5rem;letter-spacing:.05em}
</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p><div class="code">${status}</div></div></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
