import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import KeysManager from "@/app/dashboard/keys/KeysManager";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ key: "qr_sk_secret_value" }) }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const key = (id: string) => ({
  id,
  name: `key-${id}`,
  key_prefix: "qr_sk_ab12",
  scopes: ["qrcodes:read"],
  rate_limit: 100,
  is_active: true,
  last_used_at: null,
  expires_at: null,
  created_at: "2026-01-01",
});

describe("KeysManager", () => {
  it("creates a key and reveals the secret once", async () => {
    render(<KeysManager initial={[]} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. Production server"), { target: { value: "Prod" } });
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));

    expect(await screen.findByText("qr_sk_secret_value")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/keys");
  });

  it("disables creation at the 4-key cap", () => {
    render(<KeysManager initial={[key("1"), key("2"), key("3"), key("4")]} />);
    expect(screen.getByRole("button", { name: "Create key" })).toBeDisabled();
    expect(screen.getByText(/maximum/i)).toBeInTheDocument();
  });
});
