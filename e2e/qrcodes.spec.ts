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

test("generate QR via the API returns the UUID, tracking + svg urls", async ({ page }) => {
  // page.request shares the logged-in browser context's session cookie.
  const res = await page.request.post("/api/v1/qrcodes", {
    data: { destination_url: `https://example.com/campaign-${Date.now()}`, name: "Campaign API test" },
  });
  expect(res.status()).toBe(201);

  const body = await res.json();
  expect(body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  expect(body.name).toBe("Campaign API test");
  expect(body.tracking_url).toContain(`/r/${body.short_slug}`);
  expect(body.qr_svg_url).toContain(`/api/v1/qrcodes/${body.id}/qr.svg`);
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
