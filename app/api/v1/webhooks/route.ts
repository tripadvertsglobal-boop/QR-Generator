import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { withAuth } from "@/lib/auth";
import { dbError } from "@/lib/api-error";
import { logAudit, auditSnapshot } from "@/lib/audit";
import { isPublicWebhookUrlResolved } from "@/lib/ssrf";
import { createWebhookSchema } from "@/lib/validation";

// POST /api/v1/webhooks — register a webhook. JWT only. Returns the signing
// secret so the caller can verify HMAC signatures.
export const POST = withAuth(
  async (request, auth) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createWebhookSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    if (!(await isPublicWebhookUrlResolved(parsed.data.url))) {
      return NextResponse.json(
        { error: "Webhook URL must be a public http(s) endpoint" },
        { status: 400 },
      );
    }

    const secret = `whsec_${randomBytes(24).toString("hex")}`;
    const { data, error } = await auth.db
      .from("webhooks")
      .insert({ user_id: auth.userId, url: parsed.data.url, events: parsed.data.events, secret })
      .select()
      .single();

    if (error) return dbError(error);

    logAudit({
      userId: auth.userId,
      action: "webhook.create",
      resourceType: "webhook",
      resourceId: data.id,
      newValue: auditSnapshot(data),
      request,
    });
    return NextResponse.json(data, { status: 201 });
  },
  { jwtOnly: true },
);

// GET /api/v1/webhooks — list the caller's webhooks (incl. secret, owner-scoped).
export const GET = withAuth(
  async (_request, auth) => {
    const { data, error } = await auth.db
      .from("webhooks")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) return dbError(error);
    return NextResponse.json(data);
  },
  { jwtOnly: true },
);

export { preflight as OPTIONS } from "@/lib/cors";
