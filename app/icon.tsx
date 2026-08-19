import { siteConfig } from "@/site.config";

export const contentType = "image/svg+xml";

// Browser-tab icon: a stylised QR mark — three finder rings plus scattered
// data modules on an 8×8 grid.
//
// Deliberately NOT a real QR code encoding the site URL. A genuine QR needs 21+
// modules; browsers draw tab icons at 16px, so those modules land on well under
// a pixel each and the result is grey static that neither scans nor reads as a
// QR code. Eight large modules stay legible at tab size, which is the only job
// this image has. The scannable QR belongs on the page, not in the chrome.
//
// SVG rather than PNG so one file covers the tab, retina, and bookmark sizes.

/** Grid columns/rows occupied by the three finder rings. */
const FINDERS = [
  [0, 0],
  [5, 0],
  [0, 5],
];

/** Data modules, as [column, row] on the 8×8 grid. Chosen to look plausibly
 *  QR-like: never adjacent enough to blur into a blob at 16px. */
const MODULES = [
  [4, 0], [3, 2], [2, 3], [4, 3], [7, 3], [1, 4], [3, 4],
  [4, 4], [4, 5], [7, 5], [3, 6], [4, 6], [7, 6], [4, 7], [6, 7],
];

const M = 3; // module size in viewBox units
const PAD = 4; // quiet zone around the grid
const at = (n: number) => PAD + n * M;

export default function Icon() {
  const fg = "#ffffff";
  const bg = siteConfig.theme.brand;

  const finders = FINDERS.map(
    ([c, r]) =>
      // Outer 3×3 ring, then a background-coloured centre to hollow it out.
      `<rect x="${at(c)}" y="${at(r)}" width="${M * 3}" height="${M * 3}" rx="1" fill="${fg}"/>` +
      `<rect x="${at(c + 1)}" y="${at(r + 1)}" width="${M}" height="${M}" fill="${bg}"/>`,
  ).join("");

  const modules = MODULES.map(
    ([c, r]) => `<rect x="${at(c)}" y="${at(r)}" width="${M}" height="${M}" fill="${fg}"/>`,
  ).join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<rect width="32" height="32" rx="7" fill="${bg}"/>` +
    finders +
    modules +
    `</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
