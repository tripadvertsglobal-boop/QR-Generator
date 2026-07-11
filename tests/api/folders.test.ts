import { describe, it, expect, beforeEach, vi } from "vitest";
import { setDb } from "../helpers/route";
import { jsonRequest, ctx } from "../helpers/request";
import * as folders from "@/app/api/v1/folders/route";
import * as folderId from "@/app/api/v1/folders/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/v1/folders", () => {
  it("creates a folder", async () => {
    setDb([{ data: { id: "f1", name: "Work", color: null } }]);
    const res = await folders.POST(jsonRequest("POST", { name: "Work" }), ctx());
    expect(res.status).toBe(201);
  });

  it("returns 409 on a duplicate name", async () => {
    setDb([{ error: { code: "23505" } }]);
    const res = await folders.POST(jsonRequest("POST", { name: "Dup" }), ctx());
    expect(res.status).toBe(409);
  });

  it("rejects a missing name with 400", async () => {
    setDb([]);
    const res = await folders.POST(jsonRequest("POST", {}), ctx());
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/folders", () => {
  it("lists folders", async () => {
    setDb([{ data: [{ id: "f1", name: "Work" }] }]);
    const res = await folders.GET(jsonRequest("GET"), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });
});

describe("PATCH /api/v1/folders/[id]", () => {
  it("renames a folder", async () => {
    setDb([{ data: { id: "f1", name: "Old" } }, { data: { id: "f1", name: "New" } }]);
    const res = await folderId.PATCH(jsonRequest("PATCH", { name: "New" }), ctx({ id: "f1" }));
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    setDb([{ data: null }, { error: { code: "PGRST116" } }]);
    const res = await folderId.PATCH(jsonRequest("PATCH", { name: "x" }), ctx({ id: "missing" }));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/folders/[id]", () => {
  it("deletes a folder", async () => {
    setDb([{ data: { id: "f1" } }]);
    const res = await folderId.DELETE(jsonRequest("DELETE"), ctx({ id: "f1" }));
    expect(res.status).toBe(200);
  });

  it("returns 404 when not found", async () => {
    setDb([{ error: { code: "PGRST116" } }]);
    const res = await folderId.DELETE(jsonRequest("DELETE"), ctx({ id: "missing" }));
    expect(res.status).toBe(404);
  });
});
