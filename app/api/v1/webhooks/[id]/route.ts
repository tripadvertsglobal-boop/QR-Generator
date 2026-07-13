import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbError } from "@/lib/api-error";
import { logAudit, auditSnapshot } from "@/lib/audit";
import { updateWebhookSchema } from "@/lib/validation";

// PATCH /api/v1/webhooks/[id] — pause or re-enable a webhook. JWT only.
// Re-enabling resets failure_count so an endpoint auto-disabled at MAX_FAILURES
// can recover without delete/recreate (which would rotate the signing secret).
export const PATCH = withAuth(
  async (request, auth, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = updateWebhookSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const fields: Record<string, unknown> = { is_active: parsed.data.is_active };
    if (parsed.data.is_active) fields.failure_count = 0;

    const { data, error } = await auth.db
      .from("webhooks")
      .update(fields)
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 });
      return dbError(error);
    }

    logAudit({
      userId: auth.userId,
      action: "webhook.update",
      resourceType: "webhook",
      resourceId: id,
      newValue: { is_active: parsed.data.is_active },
      request,
    });
    return NextResponse.json(data);
  },
  { jwtOnly: true },
);

// DELETE /api/v1/webhooks/[id] — remove a webhook. JWT only.
export const DELETE = withAuth(
  async (request, auth, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { data, error } = await auth.db
      .from("webhooks")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 });
      return dbError(error);
    }

    logAudit({
      userId: auth.userId,
      action: "webhook.delete",
      resourceType: "webhook",
      resourceId: id,
      oldValue: auditSnapshot(data),
      request,
    });
    return NextResponse.json({ success: true });
  },
  { jwtOnly: true },
);

export { preflight as OPTIONS } from "@/lib/cors";
