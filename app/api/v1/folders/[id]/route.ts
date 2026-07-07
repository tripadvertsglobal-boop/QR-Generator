import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { updateFolderSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/v1/folders/[id] — rename / recolor (owner-scoped).
export const PATCH = withAuth(
  async (request, auth, { params }: Ctx) => {
    const { id } = await params;

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = updateFolderSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { data, error } = await auth.db
      .from("folders")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (error.code === "23505") return NextResponse.json({ error: "A folder with that name already exists" }, { status: 409 });
      return dbError(error);
    }
    logAudit({ userId: auth.userId, action: "folder.update", resourceType: "folder", resourceId: id, request });
    return NextResponse.json(data);
  },
  { scope: "folders:write" },
);

// DELETE /api/v1/folders/[id] — delete folder; member codes are detached (SET NULL).
export const DELETE = withAuth(
  async (request, auth, { params }: Ctx) => {
    const { id } = await params;

    const { error } = await auth.db
      .from("folders")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 });
      return dbError(error);
    }
    logAudit({ userId: auth.userId, action: "folder.delete", resourceType: "folder", resourceId: id, request });
    return NextResponse.json({ success: true });
  },
  { scope: "folders:write" },
);

export { preflight as OPTIONS } from "@/lib/cors";
