import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WebhooksManager from "@/app/dashboard/webhooks/WebhooksManager";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("WebhooksManager", () => {
  it("requires at least one event before posting", async () => {
    render(<WebhooksManager initial={[]} />);
    fireEvent.change(screen.getByPlaceholderText("https://your-server.com/webhook"), {
      target: { value: "https://hook.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add webhook" }));

    expect(await screen.findByText("Select at least one event")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts url + selected events", async () => {
    render(<WebhooksManager initial={[]} />);
    fireEvent.change(screen.getByPlaceholderText("https://your-server.com/webhook"), {
      target: { value: "https://hook.test" },
    });
    fireEvent.click(screen.getAllByRole("checkbox")[0]); // qr.created
    fireEvent.click(screen.getByRole("button", { name: "Add webhook" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/webhooks");
    expect(JSON.parse(opts.body)).toMatchObject({ url: "https://hook.test", events: ["qr.created"] });
  });
});
