import { mkdirSync, writeFileSync } from "node:fs";
import { loadEnv } from "./env";

export const CREDS_PATH = "e2e/.auth/creds.json";

// Provision a confirmed test user via the GoTrue admin REST API (plain fetch —
// avoids supabase-js realtime, which needs a WebSocket the bare Node process
// lacks). Teardown deletes it.
export default async function globalSetup() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("E2E needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const email = `e2e-${Date.now()}@example.com`;
  const password = `Pw-${Math.random().toString(36).slice(2)}-A1`;

  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create E2E user (${res.status}): ${await res.text()}`);
  }
  const user = (await res.json()) as { id: string };

  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync(CREDS_PATH, JSON.stringify({ email, password, userId: user.id }));
}
