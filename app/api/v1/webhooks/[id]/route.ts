import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// DELETE /api/v1/webhooks/[id] — remove a webhook. JWT only.
export const DELETE = withAuth(
  async (request, auth, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { error } = await auth.db
      .from("webhooks")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logAudit({ userId: auth.userId, action: "webhook.delete", resourceType: "webhook", resourceId: id, request });
    return NextResponse.json({ success: true });
  },
  { jwtOnly: true },
);

export { preflight as OPTIONS } from "@/lib/cors";
