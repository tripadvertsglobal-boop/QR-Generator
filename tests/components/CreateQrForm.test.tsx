import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { routerMock } from "../setup/dom";
import CreateQrForm from "@/app/dashboard/CreateQrForm";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("CreateQrForm", () => {
  it("posts the destination and refreshes on success", async () => {
    render(<CreateQrForm folders={[]} />);
    fireEvent.change(screen.getByPlaceholderText("https://example.com"), {
      target: { value: "https://example.com/x" },
    });
    fireEvent.change(screen.getByPlaceholderText("Spring flyer"), { target: { value: "My code" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/qrcodes");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toMatchObject({ destination_url: "https://example.com/x", name: "My code" });
    await waitFor(() => expect(routerMock.refresh).toHaveBeenCalled());
  });

  it("shows the API error and does not refresh", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Destination URL was flagged as unsafe" }) });
    render(<CreateQrForm folders={[]} />);
    fireEvent.change(screen.getByPlaceholderText("https://example.com"), {
      target: { value: "https://malware.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Destination URL was flagged as unsafe")).toBeInTheDocument();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });
});
