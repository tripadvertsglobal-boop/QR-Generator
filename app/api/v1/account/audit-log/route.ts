import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbError } from "@/lib/api-error";

// GET /api/v1/account/audit-log — the caller's recent mutations. JWT only.
export const GET = withAuth(
  async (request, auth) => {
    const limit = Math.min(
      200,
      Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 50),
    );

    const { data, error } = await auth.db
      .from("audit_logs")
      .select("id, action, resource_type, resource_id, old_value, new_value, ip_address, created_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return dbError(error);
    return NextResponse.json(data);
  },
  { jwtOnly: true },
);

export { preflight as OPTIONS } from "@/lib/cors";
