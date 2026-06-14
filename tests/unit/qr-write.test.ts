import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { toDbFields, stripSecret } from "@/lib/qr-write";

describe("toDbFields", () => {
  it("hashes a password into password_hash (bcrypt)", async () => {
    const fields = await toDbFields({ destination_url: "https://x", password: "secret123" });
    expect(typeof fields.password_hash).toBe("string");
    expect(await bcrypt.compare("secret123", fields.password_hash as string)).toBe(true);
    expect("password" in fields).toBe(false);
  });
  it("password: null clears the hash", async () => {
    const fields = await toDbFields({ password: null });
    expect(fields.password_hash).toBeNull();
  });
  it("password undefined leaves password_hash untouched", async () => {
    const fields = await toDbFields({ destination_url: "https://x" });
    expect("password_hash" in fields).toBe(false);
  });
  it("passes through other fields", async () => {
    const fields = await toDbFields({ destination_url: "https://x", tags: ["a"] });
    expect(fields).toMatchObject({ destination_url: "https://x", tags: ["a"] });
  });
});

describe("stripSecret", () => {
  it("removes password_hash", () => {
    expect(stripSecret({ id: "1", password_hash: "h" })).toEqual({ id: "1" });
  });
});
