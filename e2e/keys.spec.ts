import { test, expect } from "@playwright/test";

test("create and revoke an API key", async ({ page }) => {
  const name = `e2e-key-${Date.now()}`;

  await page.goto("/dashboard/keys");
  await page.getByPlaceholder("e.g. Production server").fill(name);
  await page.getByRole("button", { name: "Create key" }).click();

  // The raw secret is shown exactly once.
  await expect(page.getByText(/qr_sk_/).first()).toBeVisible();

  // It appears in the list; revoke it (accept the confirm dialog).
  const row = page.locator("li", { hasText: name });
  await expect(row).toBeVisible();
  page.on("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Revoke" }).click();
  await expect(row).toHaveCount(0);
});

test("enforces the 4-key cap", async ({ page }) => {
  await page.goto("/dashboard/keys");

  for (let i = 0; i < 4; i++) {
    const keyName = `e2e-cap-${Date.now()}-${i}`;
    await page.getByPlaceholder("e.g. Production server").fill(keyName);
    await page.getByRole("button", { name: "Create key" }).click();
    // Wait for the list to actually reflect the new key (refresh settled) before
    // the next create, so the count is deterministic.
    await expect(page.locator("li", { hasText: keyName })).toBeVisible();
  }

  // The 5th is blocked: the create button is disabled and the limit is shown.
  await expect(page.getByText(/maximum/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Create key" })).toBeDisabled();
});
