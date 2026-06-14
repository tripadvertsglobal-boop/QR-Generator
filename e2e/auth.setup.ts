import { test as setup, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { CREDS_PATH } from "./global-setup";

// Log in once via the UI and persist the session for the other specs.
setup("authenticate", async ({ page }) => {
  const { email, password } = JSON.parse(readFileSync(CREDS_PATH, "utf8"));

  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Your QR codes" })).toBeVisible();

  await page.context().storageState({ path: "e2e/.auth/state.json" });
});
