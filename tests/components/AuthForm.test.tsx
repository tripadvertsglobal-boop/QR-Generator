import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { routerMock } from "../setup/dom";
import AuthForm from "@/app/(auth)/AuthForm";

const { signIn, signUp } = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithPassword: signIn, signUp } }),
}));

beforeEach(() => vi.clearAllMocks());

function fill() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
}

describe("AuthForm (login)", () => {
  it("signs in and redirects to the dashboard", async () => {
    signIn.mockResolvedValue({ error: null });
    render(<AuthForm mode="login" />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith({ email: "a@b.com", password: "secret123" }));
    expect(routerMock.push).toHaveBeenCalledWith("/dashboard");
  });

  it("shows the error message on failure", async () => {
    signIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    render(<AuthForm mode="login" />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Invalid login credentials")).toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});

describe("AuthForm (signup)", () => {
  it("shows a confirmation notice when no session is returned", async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null });
    render(<AuthForm mode="signup" />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText(/Check your email/i)).toBeInTheDocument();
  });
});
