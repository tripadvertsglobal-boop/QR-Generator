import { describe, it, expect } from "vitest";
import { auditDiff, auditSnapshot, maskIp } from "@/lib/audit";

describe("auditSnapshot", () => {
  it("returns null for empty input", () => {
    expect(auditSnapshot(null)).toBeNull();
    expect(auditSnapshot(undefined)).toBeNull();
  });

  it("keeps normal fields and drops secrets", () => {
    const snap = auditSnapshot({
      id: "q1",
      name: "Poster",
      destination_url: "https://a.test",
      password_hash: "hash",
      key_hash: "kh",
      secret: "whsec_x",
    });
    expect(snap).toEqual({ id: "q1", name: "Poster", destination_url: "https://a.test" });
  });
});

describe("auditDiff", () => {
  it("returns only changed fields as parallel old/new maps", () => {
    const before = { name: "A", is_active: true, destination_url: "https://x.test" };
    const after = { name: "B", is_active: false, destination_url: "https://x.test" };
    const diff = auditDiff(before, after, ["name", "is_active", "destination_url"]);
    expect(diff).toEqual({
      oldValue: { name: "A", is_active: true },
      newValue: { name: "B", is_active: false },
    });
  });

  it("returns null when nothing changed", () => {
    const row = { name: "A", is_active: true };
    expect(auditDiff(row, { ...row }, ["name", "is_active"])).toBeNull();
  });

  it("deep-compares arrays/objects and never emits sensitive keys", () => {
    const before = { tags: ["a"], password: "old" };
    const after = { tags: ["a", "b"], password: "new" };
    const diff = auditDiff(before, after, ["tags", "password"]);
    expect(diff).toEqual({ oldValue: { tags: ["a"] }, newValue: { tags: ["a", "b"] } });
  });

  it("treats missing before as null old values (create-like)", () => {
    const diff = auditDiff(null, { name: "B" }, ["name"]);
    expect(diff).toEqual({ oldValue: { name: null }, newValue: { name: "B" } });
  });
});

describe("maskIp", () => {
  it("zeroes the last IPv4 octet", () => {
    expect(maskIp("203.0.113.45")).toBe("203.0.113.0");
  });
  it("keeps only the /48 of an IPv6 address", () => {
    expect(maskIp("2001:db8:abcd:12:34:56:78:90")).toBe("2001:db8:abcd::");
  });
});
