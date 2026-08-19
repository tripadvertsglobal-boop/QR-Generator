import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import Icon, { contentType } from "@/app/icon";
import { siteConfig } from "@/site.config";

// The tab icon is a stylised QR mark, not a real QR code — see app/icon.tsx for
// why. These tests pin the properties that keep it legible at 16px, since a
// regression there is invisible in code review and easy to miss in a browser.

const svg = await new Response((Icon() as Response).body).text();

/** Every <rect> in the icon, as {x, y, w, h, fill}. */
const rects = [...svg.matchAll(/<rect ([^>]+)\/>/g)].map(([, attrs]) => {
  const get = (name: string) => attrs.match(new RegExp(`${name}="([^"]+)"`))?.[1];
  return {
    x: Number(get("x") ?? 0),
    y: Number(get("y") ?? 0),
    w: Number(get("width")),
    h: Number(get("height")),
    fill: get("fill"),
  };
});

const BRAND = siteConfig.theme.brand;
const WHITE = "#ffffff";

describe("tab icon", () => {
  it("is served as SVG, so one file covers tab, retina, and bookmark sizes", () => {
    expect(contentType).toBe("image/svg+xml");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 32 32"');
  });

  it("draws three finder rings — the thing that makes it read as a QR code", () => {
    const finders = rects.filter((r) => r.fill === WHITE && r.w === 9 && r.h === 9);
    expect(finders).toHaveLength(3);
    // Each ring needs a hollow centre, or it degrades to a solid blob at 16px.
    const centres = rects.filter((r) => r.fill === BRAND && r.w === 3 && r.h === 3);
    expect(centres).toHaveLength(3);
    for (const f of finders) {
      expect(centres.some((c) => c.x === f.x + 3 && c.y === f.y + 3)).toBe(true);
    }
  });

  it("keeps every module inside the quiet zone", () => {
    // Padding is what stops the mark colliding with the rounded corners.
    for (const r of rects.filter((r) => r.w !== 32)) {
      expect(r.x).toBeGreaterThanOrEqual(4);
      expect(r.y).toBeGreaterThanOrEqual(4);
      expect(r.x + r.w).toBeLessThanOrEqual(28);
      expect(r.y + r.h).toBeLessThanOrEqual(28);
    }
  });

  it("snaps every module to the 3-unit grid", () => {
    // Off-grid rects blur under downscaling, which is the whole failure mode
    // this design exists to avoid.
    for (const r of rects.filter((r) => r.w !== 32)) {
      expect((r.x - 4) % 3, `x=${r.x}`).toBe(0);
      expect((r.y - 4) % 3, `y=${r.y}`).toBe(0);
    }
  });

  it("stays sparse enough to survive downscaling", () => {
    const modules = rects.filter((r) => r.fill === WHITE && r.w === 3);
    expect(modules.length).toBeGreaterThan(8);
    // More than half the free grid filled reads as a smudge, not a QR code.
    expect(modules.length).toBeLessThan(28);
  });

  it("takes its colour from site.config so a rebrand carries over", () => {
    expect(svg).toContain(BRAND);
    const background = rects.find((r) => r.w === 32);
    expect(background?.fill).toBe(BRAND);
  });
});

describe("favicon.ico", () => {
  it("is absent, so it cannot shadow the generated icon", () => {
    // Next emits <link rel="icon" href="/favicon.ico" sizes="any"> for this
    // file, and browsers prefer it over the generated icon — which is exactly
    // why the QR icon did not show up before.
    expect(existsSync(new URL("../../app/favicon.ico", import.meta.url))).toBe(false);
  });
});
