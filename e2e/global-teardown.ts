import { readFileSync, rmSync } from "node:fs";
import { loadEnv } from "./env";
import { CREDS_PATH } from "./global-setup";

// Delete the seeded user (cascades to all owned rows) and clear local auth state.
export default async function globalTeardown() {
  loadEnv();
  try {
    const { userId } = JSON.parse(readFileSync(CREDS_PATH, "utf8"));
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    await fetch(`${url}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` },
    });
  } catch {
    /* nothing to clean up */
  }
  rmSync("e2e/.auth", { recursive: true, force: true });
}
