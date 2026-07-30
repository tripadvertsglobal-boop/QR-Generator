import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { routerMock } from "../setup/dom";
import AuthForm from "@/app/(auth)/AuthForm";

const { signIn, signUp, signInWithOAuth } = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithPassword: signIn, signUp, signInWithOAuth } }),
}));

beforeEach(() => vi.clearAllMocks());

// `confirm` fills the signup-only confirm-password field; omit it on login.
function fill(confirm?: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
  if (confirm !== undefined) {
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: confirm } });
  }
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
    fill("secret123");
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText(/Check your email/i)).toBeInTheDocument();
  });

  it("redirects to the dashboard when signup returns a session", async () => {
    signUp.mockResolvedValue({ data: { session: { user: {} } }, error: null });
    render(<AuthForm mode="signup" />);
    fill("secret123");
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/dashboard"));
  });

  it("rejects mismatched passwords without calling Supabase", async () => {
    render(<AuthForm mode="signup" />);
    fill("different456");
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("has no confirm-password field on login", () => {
    render(<AuthForm mode="login" />);
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
  });
});

describe("AuthForm (Google)", () => {
  it("starts the OAuth flow pointed at the callback route", async () => {
    signInWithOAuth.mockResolvedValue({ error: null });
    render(<AuthForm mode="signup" />);
    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/i }));

    await waitFor(() =>
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      }),
    );
  });

  it("surfaces an OAuth error", async () => {
    signInWithOAuth.mockResolvedValue({ error: { message: "Unsupported provider" } });
    render(<AuthForm mode="login" />);
    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/i }));

    expect(await screen.findByText("Unsupported provider")).toBeInTheDocument();
  });
});
