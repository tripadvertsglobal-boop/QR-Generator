import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Defaults are enough here: the app has no ISR/SSG pages that need a shared
// incremental cache, so no cache override is configured.
export default defineCloudflareConfig();
