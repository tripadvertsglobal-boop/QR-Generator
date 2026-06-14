import { readFileSync } from "node:fs";

// Load .env.local into process.env for local E2E runs (Next loads it for the dev
// server, but Playwright's own process and global-setup need it too). In CI the
// values come from secrets, which are already in process.env — those win.
export function loadEnv(path = ".env.local"): void {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
