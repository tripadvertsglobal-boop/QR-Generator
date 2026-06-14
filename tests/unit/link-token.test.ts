import { describe, it, expect } from "vitest";
import { createUnlockToken, verifyUnlockToken } from "@/lib/link-token";

describe("link-token", () => {
  it("verifies a freshly created token for the same slug", async () => {
    const token = await createUnlockToken("abc123");
    expect(await verifyUnlockToken("abc123", token)).toBe(true);
  });

  it("rejects a token for a different slug", async () => {
    const token = await createUnlockToken("abc123");
    expect(await verifyUnlockToken("other", token)).toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const token = await createUnlockToken("abc123");
    const [exp] = token.split(".");
    expect(await verifyUnlockToken("abc123", `${exp}.deadbeef`)).toBe(false);
  });

  it("rejects an expired token", async () => {
    expect(await verifyUnlockToken("abc123", "1.anything")).toBe(false);
  });

  it("rejects undefined / malformed tokens", async () => {
    expect(await verifyUnlockToken("abc123", undefined)).toBe(false);
    expect(await verifyUnlockToken("abc123", "nodot")).toBe(false);
  });
});
