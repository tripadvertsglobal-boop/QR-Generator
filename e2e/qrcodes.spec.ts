import { test, expect } from "@playwright/test";

// Core product loop: create a dynamic QR in the dashboard, see it listed, and
// confirm the tracking URL 302-redirects to the destination through the edge.
test("create a QR code, list it, and redirect resolves", async ({ page, request }) => {
  const name = `e2e-qr-${Date.now()}`;
  const destination = `https://example.com/e2e-${Date.now()}`;

  await page.goto("/dashboard");
  await page.getByPlaceholder("https://example.com").fill(destination);
  await page.getByPlaceholder("Spring flyer").fill(name);
  await page.getByRole("button", { name: "Create", exact: true }).click();

  // The new code shows up as its own row.
  const row = page.locator("li", { hasText: name });
  await expect(row).toBeVisible();

  // Grab its tracking URL and assert the redirect without following it.
  const href = await row.locator('a[href*="/r/"]').first().getAttribute("href");
  expect(href).toBeTruthy();

  const res = await request.get(href!, { maxRedirects: 0 });
  expect([301, 302, 307, 308]).toContain(res.status());
  expect(res.headers()["location"]).toBe(destination);
});

test("edit a QR destination and the redirect updates", async ({ page, request }) => {
  const name = `e2e-edit-${Date.now()}`;
  const original = `https://example.com/orig-${Date.now()}`;
  const updated = `https://example.com/updated-${Date.now()}`;

  await page.goto("/dashboard");
  await page.getByPlaceholder("https://example.com").fill(original);
  await page.getByPlaceholder("Spring flyer").fill(name);
  await page.getByRole("button", { name: "Create", exact: true }).click();

  const row = page.locator("li", { hasText: name });
  await expect(row).toBeVisible();
  const href = await row.locator('a[href*="/r/"]').first().getAttribute("href");

  // Open the editor, change the destination, save.
  await row.getByRole("button", { name: "Edit" }).click();
  const urlField = row.getByRole("textbox").first();
  await urlField.fill(updated);
  await row.getByRole("button", { name: "Save" }).click();

  await expect(async () => {
    const res = await request.get(href!, { maxRedirects: 0 });
    expect(res.headers()["location"]).toBe(updated);
  }).toPass({ timeout: 10_000 });
});
