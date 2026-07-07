import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { createFolderSchema } from "@/lib/validation";

// POST /api/v1/folders — create a folder (owner-scoped, unique name per user).
export const POST = withAuth(
  async (request, auth) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createFolderSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { data, error } = await auth.db
      .from("folders")
      .insert({ user_id: auth.userId, name: parsed.data.name, color: parsed.data.color ?? null })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A folder with that name already exists" }, { status: 409 });
      }
      return dbError(error);
    }
    logAudit({ userId: auth.userId, action: "folder.create", resourceType: "folder", resourceId: data.id, request });
    return NextResponse.json(data, { status: 201 });
  },
  { scope: "folders:write" },
);

// GET /api/v1/folders — list the caller's folders.
export const GET = withAuth(
  async (_request, auth) => {
    const { data, error } = await auth.db
      .from("folders")
      .select("*")
      .eq("user_id", auth.userId)
      .order("name", { ascending: true });

    if (error) return dbError(error);
    return NextResponse.json(data);
  },
  { scope: "folders:read" },
);

export { preflight as OPTIONS } from "@/lib/cors";
