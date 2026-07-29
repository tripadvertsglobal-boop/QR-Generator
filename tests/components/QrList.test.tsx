import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import QrList from "@/app/dashboard/QrList";
import type { QrCode } from "@/app/dashboard/types";

// The export endpoint 402s on the Free plan, and the CSV link is a plain
// navigation — so an ungated link would render the raw JSON error in the
// browser. These lock in that Free points at /pricing instead.
const code = (id: string): QrCode =>
  ({
    id,
    short_slug: `slug${id}`,
    destination_url: "https://example.com",
    name: `code-${id}`,
    is_active: true,
    archived_at: null,
    scan_count: 0,
    folder_id: null,
    tags: [],
    active_from: null,
    active_until: null,
    ab_destinations: null,
    has_password: false,
    created_at: "2026-01-01",
  }) as QrCode;

describe("QrList export gating", () => {
  it("links straight to the export endpoint when the plan allows it", () => {
    render(<QrList codes={[code("1")]} canExport />);
    const link = screen.getByRole("link", { name: /Export CSV/ });
    expect(link.getAttribute("href")).toBe("/api/v1/qrcodes/export");
  });

  it("sends a plan without bulk operations to /pricing instead", () => {
    render(<QrList codes={[code("1")]} canExport={false} />);
    const link = screen.getByRole("link", { name: /Export CSV/ });
    expect(link.getAttribute("href")).toBe("/pricing");
  });
});
