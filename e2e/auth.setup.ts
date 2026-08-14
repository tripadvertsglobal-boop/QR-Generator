import { test as setup, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { CREDS_PATH } from "./global-setup";

// Log in once via the UI and persist the session for the other specs.
setup("authenticate", async ({ page }) => {
  const { email, password } = JSON.parse(readFileSync(CREDS_PATH, "utf8"));

  await page.goto("/login");
  // Select by label, not placeholder — the password placeholder is a bullet run.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "QR codes", exact: true })).toBeVisible();

  await page.context().storageState({ path: "e2e/.auth/state.json" });
});
