import { NextResponse } from "next/server";
import { withAuth, purgeApiKeyCache } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// DELETE /api/v1/keys/[id] — revoke a key. JWT only. Purges the KV cache so the
// key stops authenticating immediately.
export const DELETE = withAuth(
  async (request, auth, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const { data, error } = await auth.db
      .from("api_keys")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select("key_hash")
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await purgeApiKeyCache(data.key_hash);
    logAudit({ userId: auth.userId, action: "key.delete", resourceType: "api_key", resourceId: id, request });
    return NextResponse.json({ success: true });
  },
  { jwtOnly: true },
);

export { preflight as OPTIONS } from "@/lib/cors";
