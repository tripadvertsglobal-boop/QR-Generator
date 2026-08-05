import "@testing-library/jest-dom/vitest";
import { vi, afterEach } from "vitest";
import { createElement } from "react";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  searchParams.current = new URLSearchParams();
});

// next/link → plain anchor; next/navigation → spy-able router.
vi.mock("next/link", () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children, href, ...rest }: any) => createElement("a", { href, ...rest }, children),
}));

export const routerMock = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() };

/** Mutable so a test can put a component on a URL that carries query state. */
export const searchParams = { current: new URLSearchParams() };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/",
  useSearchParams: () => searchParams.current,
}));
