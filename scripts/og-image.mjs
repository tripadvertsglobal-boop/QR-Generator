/**
 * Renders public/og.png — the 1200x630 social card referenced by every page's
 * og:image. Run with `node scripts/og-image.mjs` after changing the brand name,
 * tagline, or colours in site.config.ts.
 *
 * Deliberately a build-time script rather than a next/og ImageResponse route:
 * the card is identical on every page, and satori + resvg would add megabytes
 * of WASM to a Worker bundle that has a hard size limit.
 */
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Read the fields we need out of site.config.ts without pulling in a TS loader.
const config = readFileSync(join(root, "site.config.ts"), "utf8");
const field = (name) => config.match(new RegExp(`${name}:\\s*\n?\\s*"([^"]+)"`))?.[1] ?? "";

const name = field("name");
const tagline = field("tagline");
const brand = field("brand") || "#4f46e5";

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// A QR-ish glyph: three position markers plus a few modules. Suggests the
// product without pretending to be a scannable code.
const marker = (x, y) => `
  <rect x="${x}" y="${y}" width="66" height="66" rx="8" fill="none" stroke="${brand}" stroke-width="14"/>
  <rect x="${x + 24}" y="${y + 24}" width="18" height="18" fill="${brand}"/>`;

// Confined to the quadrant the three markers leave free (x >= 90, y >= 90) so
// nothing overlaps them.
const modules = [
  [96, 96],
  [126, 96],
  [156, 96],
  [96, 126],
  [156, 126],
  [96, 156],
  [126, 156],
]
  .map(([x, y]) => `<rect x="${x}" y="${y}" width="18" height="18" rx="3" fill="${brand}"/>`)
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect width="1200" height="12" fill="${brand}"/>
  <g transform="translate(96, 150)">
    ${marker(0, 0)}
    ${marker(114, 0)}
    ${marker(0, 114)}
    ${modules}
  </g>
  <text x="96" y="420" font-family="Helvetica, Arial, sans-serif" font-size="82" font-weight="700" fill="#0a0a0a">${escape(name)}</text>
  <text x="96" y="492" font-family="Helvetica, Arial, sans-serif" font-size="36" fill="#525252">${escape(tagline)}</text>
  <text x="96" y="566" font-family="Helvetica, Arial, sans-serif" font-size="28" font-weight="500" fill="${brand}">qrbuilderstudio.com</text>
</svg>`;

mkdirSync(join(root, "public"), { recursive: true });
const out = join(root, "public", "og.png");
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);

console.log(
  `wrote public/og.png — ${name} — ${(statSync(out).size / 1024).toFixed(1)} KB`,
);
