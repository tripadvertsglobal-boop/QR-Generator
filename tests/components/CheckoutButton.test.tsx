import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { routerMock, searchParams } from "../setup/dom";
import CheckoutButton from "@/app/pricing/CheckoutButton";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

function ok(url = "https://checkout.stripe.com/c/pay/cs_test_1") {
  return { ok: true, status: 200, json: async () => ({ url }) };
}

describe("CheckoutButton", () => {
  it("sends a signed-out visitor to signup carrying the plan", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    render(<CheckoutButton plan="pro" label="Start Pro" highlighted />);
    fireEvent.click(screen.getByRole("button", { name: "Start Pro" }));

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/signup?plan=pro"));
  });

  it("surfaces a checkout error without navigating", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: "Stripe is down" }) });
    render(<CheckoutButton plan="pro" label="Start Pro" highlighted />);
    fireEvent.click(screen.getByRole("button", { name: "Start Pro" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Stripe is down");
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("does nothing on its own without a matching intent", () => {
    render(<CheckoutButton plan="pro" label="Start Pro" highlighted />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resumes checkout when returning from signup", async () => {
    searchParams.current = new URLSearchParams("checkout=pro");
    fetchMock.mockResolvedValue(ok());
    render(<CheckoutButton plan="pro" label="Start Pro" highlighted />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/billing/checkout", expect.objectContaining({ method: "POST" }));
  });

  it("only the button for the intended plan resumes", async () => {
    searchParams.current = new URLSearchParams("checkout=business");
    fetchMock.mockResolvedValue(ok());
    render(<CheckoutButton plan="pro" label="Start Pro" highlighted />);

    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores an unrecognised checkout value", async () => {
    searchParams.current = new URLSearchParams("checkout=https://evil.test");
    render(<CheckoutButton plan="pro" label="Start Pro" highlighted />);

    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
